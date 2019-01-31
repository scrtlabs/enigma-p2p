const Task = require('./Task');
let Result = require('./Result');
const constants = require('../../common/constants');
class DeployTask extends Task{
  /**
   * @param {JSON} deployReqMsg , all fields specified in the `expected` list in the func
   * @return {DeployTask} task
   * */
    static buildTask(deployReqMsg){
      let expected = ['taskId','preCode','encryptedArgs','encryptedFn','userDHKey','gasLimit','contractAddress'];
      let isMissing = expected.some(attr=>{
        return !(attr in deployReqMsg);
      });
      //TODO:: check more stuff in each field when building the task
      if(isMissing){
        return null;
      }else{
        return new DeployTask(
            deployReqMsg.taskId,
            deployReqMsg.preCode,
            deployReqMsg.encryptedArgs,
            deployReqMsg.encryptedFn,
            deployReqMsg.userDHKey,
            deployReqMsg.gasLimit,
            deployReqMsg.contractAddress,
        )
      }
    }
    constructor(taskId,preCode,encryptedArgs,encryptedFn,userDHKey,gasLimit,contractAddr){
      super(taskId, constants.CORE_REQUESTS.DeploySecretContract);
      this._preCode = preCode;
      this._encryptedArgs = encryptedArgs;
      this._encryptedFn = encryptedFn;
      this._userDHKey = userDHKey;
      this._gasLimit = gasLimit;
      this._contractAddr = contractAddr;
    }
    getPreCode(){
      return this._preCode;
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
      let output ={
        status : this.getStatus(),
        taskId : this.getTaskId(),
        preCode : this.getPreCode(),
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
        let task = DeployTask.buildTask(taskObj);
        task._setStatus(taskObj.status);
        if(taskObj.result && taskObj.result.status !== constants.TASK_STATUS.FAILED){
          // here is string
          let result = Result.DeployResult.buildDeployResult(taskObj.result);
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
module.exports = DeployTask;
