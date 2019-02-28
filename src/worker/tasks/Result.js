const constants = require('../../common/constants');
const nodeUtils = require('../../common/utils');

class Result {
  constructor(taskId, status) {
    this._taskId = taskId;
    this._status = status;
  }
  getTaskId() {
    return this._taskId;
  }
  getStatus() {
    return this._status;
  }
  isSuccess() {
    return this._status === constants.TASK_STATUS.SUCCESS;
  }
  isFailed() {
    return !this.isSuccess();
  }
  /**
   * build the relevant result
   * @param {string} type
   * @param {Json} rawResult
   * @return {Task} the concrete instance
   * */
  static buildFromRaw(type,rawResult){
    let result = null;
    switch(type){
      case constants.CORE_REQUESTS.FailedTask:
        rawResult.status = constants.TASK_STATUS.FAILED;
        result = FailedResult.buildFailedResult(rawResult);
        break;
      case constants.CORE_REQUESTS.DeploySecretContract:
        rawResult.status = constants.TASK_STATUS.SUCCESS;
        result = DeployResult.buildDeployResult(rawResult);
        break;
      case constants.CORE_REQUESTS.ComputeTask:
        rawResult.status = constants.TASK_STATUS.SUCCESS;
        result = ComputeResult.buildComputeResult(rawResult);
        break;
    }
    return result;
  }
}
class ComputeResult extends Result {
  constructor(taskId, status, output, delta, usedGas, ethereumPayload, ethereumAddress, signature) {
    super(taskId, status);
    this._output = output;
    this._delta = delta;
    this._usedGas = usedGas;
    this._ethereumPayload = ethereumPayload;
    this._ethereumAddress = ethereumAddress;
    this._signature = signature;
  }
  static buildComputeResult(result) {
    if (nodeUtils.isString(result)) {
      result = JSON.parse(result);
    }
    const expected = ['taskId', 'status', 'output', 'delta', 'usedGas', 'ethereumPayload', 'ethereumAddress', 'signature'];
    const isMissing = expected.some((attr)=>{
      return !(attr in result);
    });
    if (isMissing) return null;
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
  getOutput() {
    return this._output;
  }
  getUsedGas() {
    return this._usedGas;
  }
  getDelta() {
    return this._delta;
  }
  getEthPayload() {
    return this._ethereumPayload;
  }
  getEthAddr() {
    return this._ethereumAddress;
  }
  getSignature() {
    return this._signature;
  };
  getPreCodeHash() {
    return this._preCodeHash;
  }
  toDbJson() {
    return JSON.stringify({
      taskId: this.getTaskId(),
      status: this.getStatus(),
      output: this.getOutput(),
      delta: this.getDelta(),
      usedGas: this.getUsedGas(),
      ethereumPayload: this.getEthPayload(),
      ethereumAddress: this.getEthAddr(),
      signature: this.getSignature(),
    });
  }
}


class DeployResult extends ComputeResult {
  constructor(taskId, status, output, delta, usedGas, ethereumPayload, ethereumAddress, signature, preCodeHash) {
    super(taskId, status, output, delta, usedGas, ethereumPayload, ethereumAddress, signature);
    this._preCodeHash = preCodeHash;
  }
  static buildDeployResult(result) {
    if (nodeUtils.isString(result)) {
      result = JSON.parse(result);
    }
    const expected = ['taskId', 'status', 'output', 'delta', 'usedGas', 'ethereumPayload', 'ethereumAddress', 'signature', 'preCodeHash'];
    const isMissing = expected.some((attr)=>{
      return !(attr in result);
    });
    if (isMissing) return null;
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
  getPreCodeHash() {
    return this._preCodeHash;
  }
  toDbJson() {
    return JSON.stringify({
      taskId: this.getTaskId(),
      status: this.getStatus(),
      preCodeHash: this.getPreCodeHash(),
      output: this.getOutput(),
      delta: this.getDelta(),
      usedGas: this.getUsedGas(),
      ethereumPayload: this.getEthPayload(),
      ethereumAddress: this.getEthAddr(),
      signature: this.getSignature(),
    });
  }
}

class FailedResult extends Result {
  constructor(taskId, status, output, usedGas, signature) {
    super(taskId, status);
    this._output = output;
    this._usedGas = usedGas;
    this._signature = signature;
  }
  static buildFailedResult(errRes) {
    if (nodeUtils.isString(errRes)) {
      errRes = JSON.parse(errRes);
    }
    const expected = ['taskId', 'output', 'usedGas', 'signature'];
    const isMissing = expected.some((attr)=>{
      return !(attr in errRes);
    });
    if (isMissing) return null;
    return new FailedResult(
        errRes.taskId,
        constants.TASK_STATUS.FAILED,
        errRes.output,
        errRes.usedGas,
        errRes.signature);
  }
  getOutput() {
    return this._output;
  }
  getUsedGas() {
    return this._usedGas;
  }
  getSignature() {
    return this._signature;
  }
  toDbJson() {
    return JSON.stringify({
      taskId: this.getTaskId(),
      status: this.getStatus(),
      output: this.getOutput(),
      usedGas: this.getUsedGas(),
      signature: this.getSignature(),
    });
  }
}
module.exports.Result = Result;
module.exports.DeployResult = DeployResult;
module.exports.ComputeResult = ComputeResult;
module.exports.FailedResult = FailedResult;
