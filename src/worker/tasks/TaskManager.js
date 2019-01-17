const DbApi = require('../../db/LevelDbApi');
const constants = require('../../common/constants');
const path = require('path');
const Task = require('./Task');
const EventEmitter = require('events').EventEmitter;
const nodeUtils = require('../../common/utils');

class TaskManager extends EventEmitter {
  constructor(dbPath,logger) {
    super();
    if(dbPath){
      this._dbPath = dbPath;
    }else{
      this._dbPath = path.join(__dirname, '/task_manager_db');
    }

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

