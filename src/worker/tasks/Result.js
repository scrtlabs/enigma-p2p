const constants = require('../../common/constants');

class Result{
  constructor(taskId,status){
    this._taskId = taskId;
    this._status = status;
  }
  getTaskId(){
    return this._taskId;
  }
  getStatus(){
    return this._status;
  }
  isSuccess(){
    return this._status === constants.TASK_STATUS.SUCCESS;
  }
  isFailed(){
    return !this.isSuccess();
  }
}
class ComputeResult extends Result{
  constructor(taskId,status,output,delta,usedGas,ethereumPayload,ethereumAddress,signature){
    super(taskId,status);
    this._output = output;
    this._delta = delta;
    this._usedGas = usedGas;
    this._ethereumPayload = ethereumPayload;
    this._ethereumAddress = ethereumAddress;
    this._signature = signature;
  }
  static buildComputeResult(result){
    let expected = ['taskId','status','output','delta','usedGas','ethereumPayload','ethereumAddress','signature'];
    let isMissing = expected.some(attr=>{
      return !(attr in result);
    });
    if(isMissing) return null;
    return new ComputeResult(
        result.taskId,
        result.status,
        result.output,
        result.delta,
        result.usedGas,
        result.ethereumPayload,
        result.ethereumAddress,
        result.signature);
  }
  getOutput(){
    return this._output;
  }
  getUsedGas(){return this._usedGas;}
  getDelta(){return this._delta;}
  getEthPayload(){return this._ethereumPayload;}
  getEthAddr(){return this._ethereumAddress;}
  getSignature(){return this._signature};
  toDbJson(){
    return JSON.stringify({
      taskId : this.getTaskId(),
      status : this.getStatus(),
      output : this.getOutput(),
      delta : this.getDelta(),
      usedGas : this.getUsedGas(),
      ethereumPayload : this.getEthPayload(),
      ethereumAddress : this.getEthAddr(),
      signature : this.getSignature()
    });
  }
}


class DeployResult extends ComputeResult{
  constructor(taskId,status,output,delta,usedGas,ethereumPayload,ethereumAddress,signature,preCodeHash){
    super(taskId,status,output,delta,usedGas,ethereumPayload,ethereumAddress,signature);
    this._preCodeHash = preCodeHash;
  }
  static buildDeployResult(result){
    let expected = ['taskId','status','output','delta','usedGas','ethereumPayload','ethereumAddress','signature','preCodeHash'];
    let isMissing = expected.some(attr=>{
      return !(attr in result);
    });
    if(isMissing) return null;
    return new DeployResult(
        result.taskId,
        result.status,
        result.output,
        result.delta,
        result.usedGas,
        result.ethereumPayload,
        result.ethereumAddress,
        result.signature,
        result.preCodeHash
    );
  }
  getPreCodeHash(){return this._preCodeHash;}
  toDbJson(){
    return JSON.stringify({
      taskId : this.getTaskId(),
      status : this.getStatus(),
      preCodeHash : this.getPreCodeHash(),
      output : this.getOutput(),
      delta : this.getDelta(),
      usedGas : this.getUsedGas(),
      ethereumPayload : this.getEthPayload(),
      ethereumAddress : this.getEthAddr(),
      signature : this.getSignature()
    });
  }
}

class FailedResult extends Result{
  constructor(taskId,status,output,usedGas,signature){
    super(taskId,status);
    this._output = output;
    this._usedGas = usedGas;
    this._signature = signature;
  }
  static buildFailedResult(errRes){
    let expected = ['taskId','output','usedGas','signature'];
    let isMissing = expected.some(attr=>{
      return !(attr in errRes);
    });
    if(isMissing) return null;
    return new FailedResult(
        errRes.taskId,
        constants.TASK_STATUS.FAILED,
        errRes.output,
        errRes.usedGas,
        errRes.signature);
  }
  getOutput(){
    return this._output;
  }
  getUsedGas(){
    return this._usedGas;
  }
  getSignature(){
    return this._signature;
  }
  toDbJson(){
    return JSON.stringify({
      taskId : this.getTaskId(),
      status : this.getStatus(),
      output : this.getOutput(),
      usedGas : this.getUsedGas(),
      signature : this.getSignature(),
    });
  }
}

module.exports.Result = Result;
module.exports.DeployResult = DeployResult;
module.exports.ComputeResult = ComputeResult;
module.exports.FailedResult = FailedResult;


