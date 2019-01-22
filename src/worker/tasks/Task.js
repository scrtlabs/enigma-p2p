const constants = require('../../common/constants');
const EventEmitter = require('events').EventEmitter;

class Task extends EventEmitter{
  constructor(taskId){
    super();
    this._taskId = taskId;
    this._status = constants.TASK_STATUS.UNVERIFIED;
  }
  _setStatus(status){
      this._status = status;
      this.emit('status',{taskId : this._taskId, status : status });
  }
  setInProgressStatus(){
    this._setStatus(constants.TASK_STATUS.IN_PROGRESS);
    return this;
  }
  setSuccessStatus(){
    this._setStatus(constants.TASK_STATUS.SUCCESS);
    return this;
  }
  setFailedStatus(){
    this._setStatus(constants.TASK_STATUS.FAILED);
    return this;
  }
  getStatus(){
    return this._status;
  }
  getTaskId(){
    return this._taskId;
  }
  isUnverified(){
    return (this._status === constants.TASK_STATUS.UNVERIFIED);
  }
}
module.exports = Task;
