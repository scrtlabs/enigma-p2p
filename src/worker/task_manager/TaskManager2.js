const DbApi = require('../../db/LevelDbApi');
const constants = require('../../common/constants');
const path = require('path');

const EventEmitter = require('events').EventEmitter;

class TaskManager extends EventEmitter {
  constructor(dbPath) {
    super();
    if(dbPath){
      this._dbPath = dbPath;
    }else{
      this._dbPath = path.join(__dirname, '/task_manager_db');
    }
  }
  /*
  * Saves a task to the db
  * trigger task action to core and pass this as a result class callback
  * */
  addTask(unverifiedTask){
    if(unverifiedTask){

    }
  }
  getTaskStatus(taskId){

  }
  /**
   * callback by an action that finished computation
   *
   */
  finishTask(taskStatus,taskResult){

  }
}

