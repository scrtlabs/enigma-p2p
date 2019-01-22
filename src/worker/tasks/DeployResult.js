const ComputeResult = require('./ComputeResult');

class DeployResult extends ComputeResult{
  constructor(taskId,status,output,delta,usedGas,ethereumPayload,ethereumAddress,signature,preCodeHash){
    super(taskId,status,output,delta,usedGas,ethereumPayload,ethereumAddress,signature);
    this._preCodeHash = preCodeHash;
  }
  static buildComputeDeployResult(result){
    let expected = ['taskId','status','output','delta','usedGas','ethereumPayload','ethereumAddress','signature','preCodeHash'];
    let isMissing = expected.some(attr=>{
      return !(attr in computeReqMsg);
    });
    return new DeployResult(
        result.taskId,
        result.status,
        result.output,
        result.delta,
        result.usedGas,
        result.ethereumPayload,
        result.ethereumAddress,
        result.signature,
        result.preCodeHash);
  }
  getPreCodeHash(){return this._preCodeHash;}
}

module.exports = DeployResult;
