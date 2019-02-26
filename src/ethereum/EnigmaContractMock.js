class EnigmaContractMock {

  constructor() {
    this._taskRecords = {};
    this._epochSize = null;
    this._eventListeners = {};
    this._workersParams = [];
  }

  setTaskParams(taskId, deltaHash, outputHash, blockNumber, status, gasLimit) {
    this._taskRecords[taskId] = {taskId: taskId,
                                 deltaHash: deltaHash,
                                 outputHash: outputHash,
                                 blockNumber: blockNumber,
                                 status: status,
                                 gasLimit: gasLimit};
  }

  setEpochSize(size) {
    this._epochSize = size;
  }

  setWorkerParams(workerParams) {
    this._workersParams = workerParams;
  }

  getTaskParams(taskId) {
    return this._taskRecords[taskId];
  }

  getEpochSize() {
    return this._epochSize;
  }

  getAllWorkerParams() {
    return this._workersParams;
  }

  subscribe(eventName, filter, callback) {
    this._eventListeners[eventName] = callback;
  }

  triggerEvent(eventName, event) {
    this._eventListeners[eventName](null, event);
  }
}

module.exports = EnigmaContractMock;
