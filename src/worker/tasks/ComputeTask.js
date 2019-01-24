const Task = require('./Task');
let Result = require('./Result');
class ComputeTask extends Task{
  /**
   * @param {JSON} computeReqMsg , all fields specified in the `expected` list in the func
   * @return {ComputeTask} task
   * */
  static buildTask(computeReqMsg){
    let expected = ['taskId','encryptedArgs','encryptedFn','userDHKey','gasLimit','contractAddress'];
    let isMissing = expected.some(attr=>{
      return !(attr in computeReqMsg);
    });
    //TODO:: check more stuff in each field when building the task
    if(isMissing){
      return null;
    }else{
      return new ComputeTask(
          computeReqMsg.taskId,
          computeReqMsg.encryptedArgs,
          computeReqMsg.encryptedFn,
          computeReqMsg.userDHKey,
          computeReqMsg.gasLimit,
          computeReqMsg.contractAddress
      );
    }
  }
  constructor(taskId,encryptedArgs,encryptedFn,userDHKey,gasLimit,contractAddr){
    super(taskId);
    this._encryptedArgs = encryptedArgs;
    this._encryptedFn = encryptedFn;
    this._userDHKey = userDHKey;
    this._gasLimit = gasLimit;
    this._contractAddr = contractAddr;
  }
  getEncyptedArgs(){
    return this._encryptedArgs;
  }
  getEncryptedFn(){
    return this._encryptedFn;
  }
  getUserDHKey(){
    return this._userDHKey;
  }
  getGasLimit(){
    return this._gasLimit;
  }
  getContractAddr(){
    return this._contractAddr
  }
  toDbJson(){
    let output = {
      status : this.getStatus(),
      taskId : this.getTaskId(),
      encryptedArgs : this.getEncyptedArgs(),
      encryptedFn : this.getEncryptedFn(),
      userDHKey : this.getUserDHKey(),
      gasLimit : this.getGasLimit(),
      contractAddress : this.getContractAddr(),
    };
    if(this.isFinished()){
      output.result = this._result.toDbJson();
    }
    return JSON.stringify(output);
  }
  static fromDbJson(taskObj){
    if(taskObj.status){
      let task = ComputeTask.buildTask(taskObj);
      task._setStatus(taskObj.status);
      if(taskObj.result && taskObj.result.status === constants.TASK_STATUS.SUCCESS){
        let result = Result.ComputeResult.buildComputeResult(taskObj.result);
        task.setResult(result);
      }else if(taskObj.result){
        let result = Result.FailedResult.buildFailedResult(taskObj.result);
        task.setResult(result);
      }
      return task;
    }
    return null;
  }
}
module.exports = ComputeTask;
