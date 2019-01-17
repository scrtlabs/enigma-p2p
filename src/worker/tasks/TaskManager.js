const DbApi = require('../../db/LevelDbApi');
const constants = require('../../common/constants');
const path = require('path');
const Task = require('./Task');
const EventEmitter = require('events').EventEmitter;
const nodeUtils = require('../../common/utils');
const DeployTask = require('./DeployTask');
const ComputeTask = require('./ComputeTask');

class TaskManager extends EventEmitter {
  constructor(dbPath,logger) {
    super();
    if(dbPath){
      this._dbPath = dbPath;
    }else{
      this._dbPath = path.join(__dirname, '/task_manager_db');
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
  /*
  * Saves a task to the db
  * trigger task action to core and pass this as a result class callback
  * //TODO:: currently if taskId exists it cannot be overwritten
  */
  addTask(unverifiedTask){
    if(this._isOkToAdd(unverifiedTask)){
      // add to pool
      this._unverifiedPool[unverifiedTask.getTaskId()] = {
        time : nodeUtils.unixTimestamp(),
        task : unverifiedTask,
      };
      // verify task & pass to code & save to db in-progress status & remove from unverifiedPool
      TaskManager.tryVerifyTask(unverifiedTask)
          .then(isVerified=>{
            //remove from pool
            this._unverifiedPool[unverifiedTask.getTaskId()] = null;
            if(isVerified){
              this._logger.info("[IN_PROGRESS] verified task " + unverifiedTask.getTaskId());
              unverifiedTask.setInProgressStatus();
              // save to db & pass to core && publish in-progress
              this._db.put(unverifiedTask.task.getTaskId(), unverifiedTask.task,(err)=>{
                if(err) return this._logger.error('db error saving verified task to db');
                this._logger.debug("saved to db task " + unverifiedTask.getTaskId());
                this.notify({notification : constants.NODE_NOTIFICATIONS.DO_WORK , task : unverifiedTask.task});
              });
            }else{
              // publish failed to verify
            }
      });
    }else{
      this._logger.error("TaskManager: Task is not not ok to add");
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
      this._db.push(this._DB_MAPPER, JSON.stringify(idsList),(err)=>{
        if(err){
          return callback(err);
        }
        // store the new task
      this._db.put(task.getTaskId(),task.toDbJson(),callback);
      });
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
      
    });
  }
  /**
   * delete a Task
   * @param {string} taskId
   * @param {Function} callback(err)=>{};
   * */
  removeTask(taskId,callback){
    if(this._unverifiedPool[taskId]){
      this._unverifiedPool[taskId] = null;
      this._logger.debug('[UNVERIFIED-DELETE] task ' + taskId + 'deleted');
    }
    this._db.delete(taskId,(err)=>{
      callback(err);
    });
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
   * try verify the task
   * @param {Task} unverifiedTask
   * @return {Promise<bool>} true - task verified, false - otherwise
   * */
  static async tryVerifyTask(unverifiedTask){
    return true;
  }
  /**
   * Check the Task status
   * @param {string} taskId
   * @return {string} taskStatus
   * */
  getTaskStatus(taskId){
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
    return (this._unverifiedPool[taskId] && this._unverifiedPool[taskId].task.isUnverified());
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
   * Notify observer (Some controller subscribed)
   * @param {Json} params, MUTS CONTAINT notification field
   */
  notify(params) {
    this.emit('notify', params);
  }
}

module.exports = TaskManager;
