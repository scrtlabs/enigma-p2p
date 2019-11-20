const constants = require("../../common/constants");
const utils = require("../../common/utils");
const EventEmitter = require("events").EventEmitter;
const Result = require("./Result").Result;

class Task extends EventEmitter {
  constructor(taskId, type, contractAddress, gasLimit, blockNumber) {
    super();
    this._taskId = utils.remove0x(taskId);
    this._status = constants.TASK_STATUS.UNVERIFIED;
    this._result = null;
    this._type = type;
    this._contractAddr = utils.remove0x(contractAddress);
    this._gasLimit = gasLimit;
    this._blockNumber = blockNumber;
  }
  /**
   * set the task result
   * @param {Result} result
   * */
  setResult(result) {
    if (result instanceof Result && result.getTaskId() === this.getTaskId()) {
      this._result = result;
      if (result.isSuccess()) {
        this.setSuccessStatus();
      } else {
        this.setFailedStatus();
      }
    }
  }
  /**
   * get the task result
   * @return {Result} result or null
   * */
  getResult() {
    return this._result;
  }
  _setStatus(status) {
    this._status = status;
    this.emit("status", { taskId: this._taskId, status: status });
  }
  setInProgressStatus() {
    this._setStatus(constants.TASK_STATUS.IN_PROGRESS);
    return this;
  }
  setSuccessStatus() {
    this._setStatus(constants.TASK_STATUS.SUCCESS);
    return this;
  }
  setFailedStatus() {
    this._setStatus(constants.TASK_STATUS.FAILED);
    return this;
  }
  setGasLimit(gasLimit) {
    this._gasLimit = gasLimit;
  }
  setBlockNumber(blockNumber) {
    this._blockNumber = blockNumber;
  }
  getStatus() {
    return this._status;
  }
  getTaskId() {
    return this._taskId;
  }
  getTaskType() {
    return this._type;
  }
  getGasLimit() {
    return this._gasLimit;
  }
  getContractAddr() {
    return this._contractAddr;
  }
  getBlockNumber() {
    return this._blockNumber;
  }
  isUnverified() {
    return this._status === constants.TASK_STATUS.UNVERIFIED;
  }
  isSuccess() {
    return this._status === constants.TASK_STATUS.SUCCESS;
  }
  isFailed() {
    return this._status === constants.TASK_STATUS.FAILED;
  }
  isFinished() {
    return this.isSuccess() || this.isFailed();
  }
}
module.exports = Task;
