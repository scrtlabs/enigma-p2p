const DbApi = require('../../db/LevelDbApi');
const constants = require('../../common/constants');
const path = require('path');
const Task = require('./Task');
const EventEmitter = require('events').EventEmitter;
const nodeUtils = require('../../common/utils');
const DeployTask = require('./DeployTask');
const ComputeTask = require('./ComputeTask');
const parallel = require('async/parallel');

class TaskManager extends EventEmitter {
  constructor(dbPath,logger) {
    super();
    if(dbPath){
      this._dbPath = dbPath;
    }else{
      this._dbPath = path.join(__dirname, '/tasks_db');
    }
    this._DB_MAPPER = 'mapper';
    this._db = new DbApi(this._dbPath);
    this._db.open();
    if(logger){
      this._logger = logger;
    }
    /**
     * Map of unverified tasks in memory
     * taskId => {time:unixTimestam,task:Task} (unverified status)
     * */
    this._unverifiedPool = {};
  }
  /**
   * promise based addTask wrapper
   * */
  async asyncAddTask(unverifiedTask){
    return new Promise((resolve,reject)=>{
      this.addTask(unverifiedTask,(err,isVerified)=>{
        if(err) return reject(isVerified);
        resolve(isVerified);
      });
    });
  }
  /*
  * Promise based version of addTaskUnverified()
  * **/
  async asyncAddTaskUnverified(unverifiedTask){
    return new Promise((res,rej)=>{
      this.addTaskUnverified(unverifiedTask,err=>{
        if(err) rej(err);
        else res();
      });
    });
  }
  /**
   * add a new task to the unverified (in-memory) pool.
   * @param {Task} unverifiedTask
   * @param {Function} callback (err)=>{}
   * */
  addTaskUnverified(unverifiedTask,callback){
    let err = null;
    if(this._isOkToAdd(unverifiedTask)){
      // add to pool
      this._unverifiedPool[unverifiedTask.getTaskId()] = {
        time : nodeUtils.unixTimestamp(),
        task : unverifiedTask,
      };
      this.notify({notification : constants.NODE_NOTIFICATIONS.VERIFY_NEW_TASK, task : unverifiedTask});
    }else{
      let err = "TaskManager: Task is not not ok to add";
      this._logger.error(err);
    }
    if(callback){
      return callback(err);
    }
  }
  /*
  * Saves a task to the db
  * trigger task action to core and pass this as a result class callback
  * @param {Task} unverifiedTask
  * @param {Function} callback(err,isVerified=>{})
  * //TODO:: currently if taskId exists it cannot be overwritten
  */
  addTask(unverifiedTask,callback){
    if(this._isOkToAdd(unverifiedTask)){
      // add to pool
      this._unverifiedPool[unverifiedTask.getTaskId()] = {
        time : nodeUtils.unixTimestamp(),
        task : unverifiedTask,
      };
      // verify task & pass to code & save to db in-progress status & remove from unverifiedPool
        TaskManager.tryVerifyTask(unverifiedTask)
        .then(isVerified=>{
          //remove from unverified pool
          delete this._unverifiedPool[unverifiedTask.getTaskId()];
          if(isVerified){
            this._logger.info("[IN_PROGRESS] verified task " + unverifiedTask.getTaskId());
            unverifiedTask.setInProgressStatus();
            // save to db & notify
            this._storeTask(unverifiedTask,(err)=>{
              if(err){
                this._logger.error('db error saving verified task to db' + err);
                if(callback) {
                  return callback(err);
                }
              }
              this._logger.debug("[addTask] saved to db task " + unverifiedTask.getTaskId());
              this.notify({notification : constants.NODE_NOTIFICATIONS.TASK_VERIFIED , task : unverifiedTask});
              if(callback) return callback(null,isVerified);
            });
          }else{ // failed to verify
            // publish failed to verify
            if(callback){
              return callback(null,isVerified);
            }
          }
        }).catch(e=>{
          this._logger.error("[INTERNAL] error verifying task with Ethereum " + e);
          return callback(e);
        });
    }else{
      let errMsg = "TaskManager: Task is not not ok to add";
      this._logger.error(errMsg);
      if(callback){
        return callback(errMsg);
      }
    }
  }
  /**
   * Save a task into the db
   * @param {DeployTask/ComputeTask} task,
   * @param {Function} callback (err)=>{}
   * */
  _storeTask(task,callback){
    this._db.get(this._DB_MAPPER,(err,potentialIdsList)=>{
      // append the task id to list
      let idsList = [];
      if(!err){
        idsList = potentialIdsList;
      }
      idsList.push(task.getTaskId());
      // store back
      this._db.put(this._DB_MAPPER, JSON.stringify(idsList),(err)=>{
        if(err){
          return callback(err);
        }
        // store the new task
      this._db.put(task.getTaskId(),task.toDbJson(),callback);
      });
    });
  }

  /**
   * Promise based removeTask
   * */
  async asyncRemoveTask(taskId){
    return new Promise((resolve,reject)=>{
      this.removeTask(taskId,(err)=>{
        if(err) reject(err);
        else resolve(true);
      });
    });
  }
  /**
   * delete a Task
   * @param {string} taskId
   * @param {Function} callback(err)=>{};
   * */
  removeTask(taskId,callback){
    if(this._unverifiedPool[taskId]){
      delete this._unverifiedPool[taskId];
      this._logger.debug('[UNVERIFIED-DELETE] task ' + taskId + 'deleted');
    }
    this._readAndDelete(taskId,(err)=>{
      if(err){
        this._logger.error('[_readAndDelete]: ' +err);
      }
      callback(err);
    });
  }
  /**
   * get all tasks with future
   * @return {Promise<Array<Task>>}
   * */
  async asyncGetAllTasks(){
    return new Promise((resolve,reject)=>{
      this.getAllTasks((err,tasks)=>{
        if(err) reject(err);
        else resolve(tasks);
      });
    });
  }
  /**
   * get all tasks
   * @param {Function} callback(err,Array<Task>)=>{}
   * */
  getAllTasks(callback){
    let allTasks = [];
    let keys = Object.keys(this._unverifiedPool);
    // add all unverified tasks
    keys.forEach(key=>{allTasks.push(this._unverifiedPool[key].task);});
    // add all db tasks
    this._getAllDbTasks((err,tasks)=>{
      if(err instanceof Error && err.type === "NotFoundError"){
        return callback(null,allTasks);
      }else if(err){
        return callback(err);
      }else{
        return callback(null,allTasks.concat(tasks));
      }
    });
  }
  /**
   * try verify the task
   * @param {Task} unverifiedTask
   * @return {Promise<bool>} true - task verified, false - otherwise
   * */
  static async tryVerifyTask(unverifiedTask){
    return true;
  }
  /**
   * get task
   * @param {Function} callback(err,Task)=>{}
   * */
  getTask(taskId,callback){
    if(this.isUnverifiedInPool(taskId)){
      return this._unverifiedPool[taskId].task;
    }
    this._readTask(taskId,(err,task)=>{
      callback(err,task);
    });
  }
  /**
   * Check the Task status
   * @param {string} taskId
   * @return {Function} callback(status or null)
   * */
  getTaskStatus(taskId,callback){
    this.getTask((err,task)=>{
      if(err) return callback(null);
      else callback(task.getStatus());
    });
  }
  /**
   * returns all the tasks from the pull
   * @return {Array<Task>} unverifiedTasks
   * */
  getUnverifiedTasks(){
    let taskIds  = Object.keys(this._unverifiedPool);
    return taskIds.map(id=>{
      return this._unverifiedPool[id].task;
    });
  }
  /**
   * callback by an action that finished computation
   *
   */
  onFinishTask(taskStatus,taskResult){

  }
  /**
   * callback by an action that verified a task
   * */
  onVerifyTask(verificationStatus){

  }
  /** check if task is in unverified explicitly and in pool */
  isUnverifiedInPool(taskId){
    return this._unverifiedPool[taskId] && true;
    // return (this._unverifiedPool[taskId] && this._unverifiedPool[taskId].task.isUnverified());
  }
  /**
   * 24 hours currently
   * check if the TTL is still ok
   * i.e if false, then task can be overiden or removed
   * */
  isKeepAlive(taskId){
    let now = nodeUtils.unixTimestamp();
    return this._unverifiedPool[taskId] &&
        (now - this._unverifiedPool[taskId].time) < nodeUtils.unixDay();
  }
  /**
   * Promise based version of async
   * */
  async asyncStop(){
    return new Promise((res,rej)=>{
      this.stop(err=>{
        if(err) rej(err);
        else res();
      });
    });
  }
  /** stop the task manager
   * @param {Function} callback(err)=>{}
   * */
  stop(callback){
    this._db.close(err=>{
      callback(err);
    });
  }
  /**
   * Load a task from the db
   * @param {string} taskId
   * @param {Function} callback (err,Task)=>{}
   * */
  _readTask(taskId, callback){
    this._db.get(taskId,(err,res)=>{
      if(err) return callback(err);
      let task = null;
      // deploy task
      if(res.preCode){
        task = DeployTask.fromDbJson(res);
      }else{
        task = ComputeTask.fromDbJson(res);
      }
      if(task){
        callback(null,task);
      }else{
        return callback('error loading task from db');
      }
    });
  }

  /**
   * read and delete task from db
   * */
  _readAndDelete(taskId, callback){
    this._readTask(taskId,(err,task)=>{
      if(err) {
        if(err instanceof Error && err.type === "NotFoundError"){
          callback(null);
        }else{
          this._logger.error("error reading task " + err);
          return callback(err);
        }
      }
      this._db.get(this._DB_MAPPER,(err,idsList)=>{
        if(err) return callback(err);
        let idx = idsList.indexOf(taskId);
        if(idx>-1){
          let deletedId = idsList.splice(idx,1);
          this._db.put(this._DB_MAPPER, JSON.stringify(idsList),(err)=>{
            if(err) return callback(err);
            // delete the task object
            this._db.delete(taskId,(err)=>{
              return callback(err,task);
            });
          });
        }else{
          this._logger.debug('[ERROR] cant find taskId,skipping');
        }
      });
    });
  }
  /**promise based get all stored ids */
  async _asyncGetAllStoredIds(){
    return new Promise((resolve,reject)=>{
      this._getAllStoredIds((err,ids)=>{
        if(err) reject(err);
        else resolve(ids);
      });
    });
  }

  /** get all stored task ids
   * @param {Function} callback(err,Array<string>)=>{}
   * */
  _getAllStoredIds(callback){
    this._db.get(this._DB_MAPPER,(err,idsList)=>{
      callback(err,idsList);
    });
  }
  /** get all the tasks from db
   * @{Function} callback(err,Array<Task>)=>{}
   * */
  _getAllDbTasks(callback){
    this._getAllStoredIds((err,idsList)=>{
      if(err) return callback(err);
      this._getDbTasksFromList(idsList,(err,allTasks)=>{
        callback(err,allTasks)
      });
    });
  }
  /**
   * get tasks from db given some list
   * @{Function} callback(err,Array<Task>)=>{}
   * */
  _getDbTasksFromList(idsList,callback){
    let jobs = [];
    idsList.forEach(id=>{
      jobs.push(cb=>{
        this._readTask(id,(err,task)=>{
          cb(err,task);
        });
      });
    });
    parallel(jobs,(err,tasks)=>{
      callback(err,tasks);
    });
  }
  /**
   * Update some task status
   * */
  _updateTaskStatus(taskId,status,callback){
    let theTask = null;
    if(this.isUnverifiedInPool(taskId) && status !== constants.TASK_STATUS.UNVERIFIED){
      theTask = this._unverifiedPool[taskId].task;
    }
    //TODO continue here HW
  }

  /**
   * validation if its ok to add the task to the unverifiedPool
   * checks:
   * - if instance of Task
   * AND
   * - if not existing
   * */
  _isOkToAdd(unverifiedTask){
    return (unverifiedTask instanceof Task &&
    (!this.isUnverifiedInPool(unverifiedTask.getTaskId())));
  }
  /**
   * Notify observer (Some controller subscribed)
   * @param {Json} params, MUTS CONTAINT notification field
   */
  notify(params) {
    this.emit('notify', params);
  }
}

module.exports = TaskManager;
