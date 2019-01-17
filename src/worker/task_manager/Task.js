const constants = require('../../common/constants');
const EventEmitter = require('events').EventEmitter;

class Task extends EventEmitter{
  constructor(taskId){
    super();
    this._taskId = taskId;
    this._status = constants.TASK_STATUS.UNVERIFIED;
  }
  setStatus(status){
    if(status in constants.TASK_STATUS){
      this._status = status;
      this.emit('status',{taskId : this._taskId, status : status });
    }else{
      console.log("[-] Err status %s doesn't exist ",status);
    }
  }
  getStatus(){
    return this._status;
  }
  getTaskId(){
    return this.taskId;
  }
  isUnverified(){
    return (this._status === constants.TASK_STATUS.UNVERIFIED);
  }
}
module.exports = Task;
