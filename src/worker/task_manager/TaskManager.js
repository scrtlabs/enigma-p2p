const DbApi = require('../../db/LevelDbApi');
const constants = require('../../common/constants');
const path = require('path');
const Task = require('./Task');
const EventEmitter = require('events').EventEmitter;

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
  * */
  addTask(unverifiedTask){
    if(unverifiedTask instanceof Task){
      this._unverifiedPool[unverifiedTask.getTaskId()] = unverifiedTask;
    }else{
      this._logger.error("TaskManager: is not instanceof Task");
    }
  }
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
}

