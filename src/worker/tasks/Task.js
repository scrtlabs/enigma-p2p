const constants = require('../../common/constants');
const EventEmitter = require('events').EventEmitter;
const Result = require('./Result');
class Task extends EventEmitter{
  constructor(taskId){
    super();
    this._taskId = taskId;
    this._status = constants.TASK_STATUS.UNVERIFIED;
    this._result = null;
  }
  /**
   * set the task result
   * @param {Result} result
   * */
  setResult(result){
    if(result instanceof Result && result.getTaskId() === this.getTaskId()){
      this._result = result;
      if(result.isSuccess()){
        this.setSuccessStatus();
      }else{
        this.setFailedStatus();
      }
    }
  }
  /**
   * get the task result
   * @return {Result} result or null
   * */
  getResult(){
    return this._result;
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
