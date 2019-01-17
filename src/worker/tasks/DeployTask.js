const Task = require('./Task');

class DeployTask extends Task{
  /**
   * @param {JSON} deployReqMsg , all fields specified in the `expected` list in the func
   * @return {DeployTask} task
   * */
    static buildTask(deployReqMsg){
      let expected = ['taskId','preCode','encryptedArgs','encryptedFn','userPubKey','gasLimit','contractAddress'];
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
            deployReqMsg.userPubKey,
            deployReqMsg.gasLimit,
            deployReqMsg.contractAddr,
        )
      }
    }
    constructor(taskId,preCode,encryptedArgs,encryptedFn,userPubKey,gasLimit,contractAddr){
      super(taskId);
      this._preCode = preCode;
      this._encryptedArgs = encryptedArgs;
      this._encryptedFn = encryptedFn;
      this._userPubKey = userPubKey;
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
    getUserPubKey(){
      return this._userPubKey;
    }
    getGasLimit(){
      return this._gasLimit;
    }
    getContractAddr(){
      return this._contractAddr
    }
}
