const Task = require('./Task');

class ComputeTask extends Task{
  /**
   * @param {JSON} computeReqMsg , all fields specified in the `expected` list in the func
   * @return {ComputeTask} task
   * */
  static buildTask(computeReqMsg){
    let expected = ['taskId','encryptedArgs','encryptedFn','userPubKey','gasLimit','contractAddress'];
    let isMissing = expected.some(attr=>{
      return !(attr in deployReqMsg);
    });
    //TODO:: check more stuff in each field when building the task
    if(isMissing){
      return null;
    }else{
      return new ComputeTask(
          computeReqMsg.taskId,
          computeReqMsg.encryptedArgs,
          computeReqMsg.encryptedFn,
          computeReqMsg.userPubKey,
          computeReqMsg.gasLimit,
          computeReqMsg.contractAddress
      );
    }
  }
  constructor(taskId,encryptedArgs,encryptedFn,userPubKey,gasLimit,contractAddr){
    super(taskId);
    this._encryptedArgs = encryptedArgs;
    this._encryptedFn = encryptedFn;
    this._userPubKey = userPubKey;
    this._gasLimit = gasLimit;
    this._contractAddr = contractAddr;
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
