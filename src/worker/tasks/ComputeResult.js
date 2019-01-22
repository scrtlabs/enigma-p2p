const Result = require('./Result');

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
      return !(attr in computeReqMsg);
    });
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
}

module.export = ComputeResult;
