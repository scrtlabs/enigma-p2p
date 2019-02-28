class EnigmaContractMock {

  constructor() {
    this._taskRecords = {};
    this._contracts = {};
    this._epochSize = null;
    this._eventListeners = {};
    this._workersParams = [];
  }

  setTaskParams(taskId, blockNumber, status, gasLimit) {
    this._taskRecords[taskId] = {taskId: taskId,
                                 blockNumber: blockNumber,
                                 status: status,
                                 gasLimit: gasLimit};
  }

  setContractParams(contractAddress, codeHash, deltas, outputs) {
    this._contracts[contractAddress] = {codeHash: codeHash, deltas: deltas, outputs: outputs};
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

  getContractParams(contractAddress) {
    // console.log("contract address=" + contractAddress);
    // console.log("contracts=" + JSON.stringify(this._contracts));
    return this._contracts[contractAddress];
  }

  getStateDeltaHash(contractAddress, key) {
    // console.log("contract address=" + contractAddress);
    // console.log("contracts=" + JSON.stringify(this._contracts));
    return this._contracts[contractAddress].deltas[key];
  }

  getOutputHash(contractAddress, key) {
    console.log("contract address=" + contractAddress);
    console.log("contracts=" + JSON.stringify(this._contracts));
    return this._contracts[contractAddress].outputs[key];
  }

  subscribe(eventName, filter, callback) {
    this._eventListeners[eventName] = callback;
  }

  triggerEvent(eventName, event) {
    this._eventListeners[eventName](null, event);
  }
}

module.exports = EnigmaContractMock;
