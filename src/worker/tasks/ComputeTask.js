const Task = require("./Task");
const Result = require("./Result");
const constants = require("../../common/constants");
const nodeUtils = require("../../common/utils");
class ComputeTask extends Task {
  /**
   * @param {JSON} computeReqMsg , all fields specified in the `expected` list in the func
   * @return {ComputeTask} task
   * */
  static buildTask(computeReqMsg) {
    const expected = [
      "taskId",
      "encryptedArgs",
      "encryptedFn",
      "userDHKey",
      "gasLimit",
      "contractAddress",
      "blockNumber"
    ];
    const isMissing = expected.some(attr => {
      return !(attr in computeReqMsg);
    });
    // TODO:: check more stuff in each field when building the task
    if (isMissing) {
      return null;
    } else {
      return new ComputeTask(
        computeReqMsg.taskId,
        computeReqMsg.encryptedArgs,
        computeReqMsg.encryptedFn,
        computeReqMsg.userDHKey,
        computeReqMsg.gasLimit,
        computeReqMsg.contractAddress,
        computeReqMsg.blockNumber
      );
    }
  }
  constructor(taskId, encryptedArgs, encryptedFn, userDHKey, gasLimit, contractAddr, blockNumber) {
    super(taskId, constants.CORE_REQUESTS.ComputeTask, contractAddr, gasLimit, blockNumber);
    this._encryptedArgs = encryptedArgs;
    this._encryptedFn = encryptedFn;
    this._userDHKey = userDHKey;
  }
  getEncryptedArgs() {
    return this._encryptedArgs;
  }
  getEncryptedFn() {
    return this._encryptedFn;
  }
  getUserDHKey() {
    return this._userDHKey;
  }
  toDbJson() {
    const output = {
      status: this.getStatus(),
      taskId: this.getTaskId(),
      encryptedArgs: this.getEncryptedArgs(),
      encryptedFn: this.getEncryptedFn(),
      userDHKey: this.getUserDHKey(),
      gasLimit: this.getGasLimit(),
      contractAddress: this.getContractAddr(),
      blockNumber: this.getBlockNumber()
    };
    if (this.isFinished()) {
      output.result = this._result.toDbJson();
    }
    return JSON.stringify(output);
  }
  toCoreJson() {
    return {
      encryptedArgs: this.getEncryptedArgs(),
      encryptedFn: this.getEncryptedFn(),
      userDHKey: this.getUserDHKey(),
      gasLimit: this.getGasLimit(),
      contractAddress: this.getContractAddr()
    };
  }
  static fromDbJson(taskObj) {
    if (taskObj.status) {
      const task = ComputeTask.buildTask(taskObj);
      task._setStatus(taskObj.status);
      if (taskObj.result && nodeUtils.isString(taskObj.result)) {
        taskObj.result = JSON.parse(taskObj.result);
      }
      if (taskObj.result && taskObj.result.status === constants.TASK_STATUS.SUCCESS) {
        const result = Result.ComputeResult.buildComputeResult(taskObj.result);
        task.setResult(result);
      } else if (taskObj.result) {
        const result = Result.FailedResult.buildFailedResult(taskObj.result);
        task.setResult(result);
      }
      return task;
    }
    return null;
  }
}
module.exports = ComputeTask;
