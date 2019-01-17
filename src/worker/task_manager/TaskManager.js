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
    if(logger){
      this._logger = logger;
    }
    /**
     * Map of unverified tasks in memory
     * taskId => Task (unverified status)
     * */
    this._unverifiedPool = {};
  }
  /*
  * Saves a task to the db
  * trigger task action to core and pass this as a result class callback
  * //TODO:: currently if taskId exists longer than 24 hours overite otherwise ignore. (?)
  * */
  addTask(unverifiedTask){
    if(unverifiedTask instanceof Task &&
        (!this.isUnverifiedInPool(unverifiedTask.getTaskId()) ||
            !this.isKeepAlive(unverifiedTask.getTaskId()))){
      // add to pool
      this._unverifiedPool[unverifiedTask.getTaskId()] = {
        time : nodeUtils.unixTimestamp(),
        task : unverifiedTask,
      };
      // verify task & pass to code & save to db in-progress status & remove from unverifiedPool
    }else{
      this._logger.error("TaskManager: is not instanceof Task");
    }
  }
  /**
   * Check the Task status
   * @param {string} taskId
   * @return {string} taskStatus
   * */
  getTaskStatus(taskId){
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
    return (this._unverifiedPool[taskId] && this._unverifiedPool[taskId].isUnverified());
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
}

