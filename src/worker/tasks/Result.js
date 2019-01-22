const constants = require('../../common/constants');

class Result{
  constructor(taskId,status){
    this._taskId = taskId;
    this._status = status;
    this._SUCCESS = constants.TASK_STATUS.SUCCESS;
    this._FAILED = constants.TASK_STATUS.FAILED;
  }
  getTaskId(){
    return this._taskId;
  }
  getStatus(){
    return this._status;
  }
  isSuccess(){
    this._status === this._SUCCESS;
  }
  isFailed(){
    return !this.isSuccess();
  }
}
module.exports=Result;
