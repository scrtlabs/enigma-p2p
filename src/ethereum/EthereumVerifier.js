const defaultsDeep = require('@nodeutils/defaults-deep');
const DbUtils = require('../common/DbUtils');
const Task = require('../worker/tasks/Task');
const DeployTask = require('../worker/tasks/DeployTask');
const constants = require('../common/constants');
const cryptography = require('../common/cryptography');
const JSBI = require('jsbi');
const abi = require('ethereumjs-abi');
const errors = require('../common/errors');
const nodeUtils = require('../common/utils');

const result = require('../worker/tasks/Result');
const Result = result.Result;
const DeployResult  = result.DeployResult;
const FailedResult  = result.FailedResult;


class EthereumVerifier {
  /**
   * {EnigmaContractReaderAPI} enigmaContractAPI
   * {EthereumServices} ethereumServices
   * {Object} logger
   * */
  constructor(contractAPI, ethereumServices, logger) {
    this._logger = logger;
    this._contractApi = contractAPI;
    this._ethereumServices = ethereumServices;
    this._workerParamArray = [];
    this._workerParamArrayMaxSize = 5;
    this._unverifiedCreateTasks = {};
    this._unverifiedSubmitTasks = {};
  }

  /**
   * Init the API
   */
  async init() {
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.NewEpoch, this._newEpochEventCallback.bind(this));
    await this._updateWorkerParamNow();
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.TaskCreation, this._taskCreationEventCallback.bind(this));
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.TaskSuccessSubmission, this._taskSubmissionEventCallback.bind(this));
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.TaskFailureSubmission, this._taskSubmissionEventCallback.bind(this));
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.SecretContractDeployment, this._taskDeployedContractEventCallback.bind(this));
  }

  /**
   * Verify task creation
   * @param {Task} task to verify
   * @param {string} workerAddress
   * @return {Promise} returning {JSON} {Boolean} isVerified - true/false if the task verified,
   *                                    {Error} error
   */
  verifyTaskCreation(task, workerAddress) {
    return new Promise((resolve) => {
      let result = {isVerified: false, gasLimit: null, error: null};
      if (!(task instanceof Task)) {
        result.error = new errors.TypeErr('Wrong task type');
        return resolve(result);
      }
      if (!DbUtils.isValidEthereumAddress(workerAddress)) {
        result.error = new errors.TypeErr('Worker address is not a valid Ethereum address');
        return resolve(result);
      }
      this._createTaskCreationListener(task, workerAddress, resolve);
      this._verifyTaskCreationNow(task).then(async (res) => {
        if (res.canBeVerified) {
          this.deleteTaskCreationListener(task.getTaskId());
          if (res.isVerified) {
            let res2 = await this.verifySelectedWorker(task, res.taskParams.blockNumber, workerAddress);
            result.error = res2.error;
            result.isVerified = res2.isVerified;
            result.gasLimit = res.taskParams.gasLimit;
          }
          else {
            result.error = res.error;
          }
          resolve(result);
        }
      });
    });
  }

  /**
   * Verify task submission
   * @param {Task} task to verify
   * @return {Promise} returning {JSON} {Boolean} isVerified - true/false if the task verified,
   *                                    {Error} error
   */
  verifyTaskSubmission(task, contractAddress) {
    return new Promise((resolve) => {
      let result = {isVerified: false, error: null};
      if (!(task instanceof Result)) {
        result.error = new errors.TypeErr('Wrong task result type');
        return resolve(result);
      }
      this._createTaskSubmissionListener(task, resolve);
      this._verifyTaskSubmissionNow(task, contractAddress).then( (res) => {
        if (res.canBeVerified) {
          this.deleteTaskSubmissionListener(task.getTaskId());
          resolve({error: res.error, isVerified: res.isVerified});
        }
      });
    });
  }

  /**
   * Delete task creation listener for the specific taskId
   * @param {String} taskId
   */
  deleteTaskCreationListener(taskId) {
    delete this._unverifiedCreateTasks[taskId];
  }

  /**
   * Delete task submission listener for the specific taskId
   * @param {String} taskId
   */
  deleteTaskSubmissionListener(taskId) {
    delete this._unverifiedSubmitTasks[taskId];
  }

  /**
   * Verify that the worker address is in the selected workers group for the given secret contract address
   * @param {Task} task - task to verify
   * @param {Integer} blockNumber - task block number
   * @param {string} workerAddress - Worker address
   * @return {Promise} returning {Boolean} true if the worker is in the selected group
   */
  verifySelectedWorker(task, blockNumber, workerAddress) {
    return new Promise((resolve) => {
      const params = this._findWorkerParamForTask(blockNumber);
      if (!params) {
        const err = new errors.TaskValidityErr("Epoch params are missing for the task " + task.getTaskId());
        return resolve({error: err, isVerified: false});
      }
      let secretContractAddress = task.getContractAddr();
      const res = this._verifySelectedWorker(secretContractAddress, workerAddress, params);
      return resolve({error: res.error, isVerified: res.isVerified});
    });
  }

  _createTaskCreationListener(task, workerAddress, resolve) {
    const taskId = task.getTaskId();
    this._setTaskCreationListener(taskId, async (event) => {
      const res = this._verifyTaskCreateParams(event.inputsHash, task);
      if (res.isVerified) {
        let res2 = await this.verifySelectedWorker(task, event.blockNumber, workerAddress);
        return resolve({error: res2.error, isVerified: res2.isVerified, gasLimit: event.gasLimit});
      }
      return resolve({error: res.error, isVerified: res.isVerified, gasLimit: null});
    });
  }

  _setTaskCreationListener(taskId, listener) {
    this._unverifiedCreateTasks[taskId] = listener;
  }

  _getTaskCreationListener(taskId) {
    return this._unverifiedCreateTasks[taskId];
  }

  _getAllTaskCreationIds() {
    return Object.keys(this._unverifiedCreateTasks);
  }

  _createTaskSubmissionListener(task, resolve) {
    const taskId = task.getTaskId();
    this._setTaskSubmissionListener(taskId, (event) => {
      // First verify the case of a FailedResult
      if (task instanceof FailedResult) {
        if (event.type === constants.ETHEREUM_EVENTS.TaskFailureSubmission) {
          resolve({error: null, isVerified: true});
        }
        else {
          const err = new errors.TaskValidityErr('Task ' + taskId + ' did not fail');
          resolve({error: err, isVerified: false});
        }
      }
      else { // Task isinstanceof TaskResult
        if (event.type === constants.ETHEREUM_EVENTS.TaskFailureSubmission) {
          // task failure is not expected
          const err = new errors.TaskFailedErr('Task ' + taskId + ' has failed');
          resolve({error:err, isVerified: false});
          }
        else {
          if (task instanceof DeployResult) {
            if (event.type !== constants.ETHEREUM_EVENTS.SecretContractDeployment) {
              const err = new errors.TaskValidityErr('Wrong event received (=' + event.type + ') for task ' + taskId);
              resolve({error:err, isVerified: false});
            }
            else {
              const res = this._verifyTaskResultsParams(event.stateDeltaHash, 0, event.codeHash, task);
              resolve({error: res.error, isVerified: res.isVerified});
            }
          }
          else { //task instanceof ComputeResult
            if (event.type !== constants.ETHEREUM_EVENTS.TaskSuccessSubmission) {
              const err = new errors.TaskValidityErr('Wrong event received (=' + event.type + ') for task ' + taskId);
              resolve({error:err, isVerified: false});
            }
            else {
              const res = this._verifyTaskResultsParams(event.stateDeltaHash, event.stateDeltaHashIndex, event.outputHash, task);
              resolve({error: res.error, isVerified: res.isVerified});
            }
          }
        }
      }
    });
  }

  _setTaskSubmissionListener(taskId, listener) {
    this._unverifiedSubmitTasks[taskId] = listener;
  }

  _getTaskSubmissionListener(taskId) {
    return this._unverifiedSubmitTasks[taskId];
  }

  _getAllTaskSubmissionIds() {
    return Object.keys(this._unverifiedSubmitTasks);
  }

  /**
   * Checks whether the task can verified now and returns the verification result
   * @param {Task} task to verify
   * @return {JSON} error
   *                canBeVerified - true/false if the task can be verified at the moment
   *                isVerified - true/false is the task can be verified now, null otherwise
   */
  _verifyTaskCreationNow(task) {
    return new Promise(async (resolve) => {
      let res = {};
      const taskId = task.getTaskId();

      try {
        res.taskParams = await this._contractApi.getTaskParams(taskId);
      }
      catch (e) {
        this._logger.info(`error received while trying to read task params for taskId ${taskId}: ${e}`);
        // TODO: consider adding a retry mechanism
        res.canBeVerified = true;
        res.isVerified = false;
        res.error = e;
        return resolve(res);
      }

      if (res.taskParams.status === constants.ETHEREUM_TASK_STATUS.RECORD_CREATED) {
        res = defaultsDeep(res, this._verifyTaskCreateParams(res.taskParams.inputsHash, task));
        res.canBeVerified = true;
      }
      else if (res.taskParams.status === constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED) {
        res.canBeVerified = false;
        res.isVerified = null;
        res.error = null;
      }
      else {
        res.canBeVerified = true;
        res.isVerified = false;
        res.error = new errors.TaskValidityErr(`Task remote status is not expected (=${res.taskParams.status})`);
      }
      return resolve(res);
    });
  }

  /**
   * Checks whether the task can verified now and returns the verification result
   * @param {Task} task to verify
   * @return {JSON} error
   *                canBeVerified - true/false if the task can be verified at the moment
   *                isVerified - true/false is the task can be verified now, null otherwise
   */
  async _verifyTaskSubmissionNow(task, contractAddress) {
    return new Promise(async (resolve) => {
      let res = {};
      const taskId = task.getTaskId();
      let taskParams;

      try {
        taskParams = await this._contractApi.getTaskParams(taskId);

        if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED) {
          res.canBeVerified = true;

          if (task instanceof FailedResult) {
            res.isVerified = false;
            res.error = new errors.TaskValidityErr(`Task ${taskId} did not fail`);
          }
          else {
            let result = {};
            if (task instanceof DeployResult) {
              result = await this._checkDeployResult(task, contractAddress);
            }
            else {
              result = await this._checkComputeResult(taskParams, task, contractAddress);
            }
            res.isVerified = result.isVerified;
            res.error = result.error;
          }
        }
        else if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED) {
          res.canBeVerified = true;

          if (task instanceof FailedResult) {
            res.isVerified = true;
            res.error = null;
          }
          else {
            res.isVerified = false;
            res.error = new errors.TaskFailedErr(`Task ${taskId} has failed`);
          }
        }
        else {
          res.canBeVerified = false;
          res.isVerified = null;
          res.error = null;
        }
      }
      catch (e) {
        this._logger.info(`error received while trying to verify result of task taskId ${taskId}: ${e}`);
        // TODO: consider adding a retry mechanism
        res.canBeVerified = true;
        res.isVerified = false;
        res.error = e;
      }
      return resolve(res);
    });
  }

  async _checkDeployResult(task, contractAddress) {
    let res = {};

    const deltaKey = task.getDelta().key;
    if (deltaKey !== 0) {
      res.isVerified = false;
      res.error = new errors.TaskVerificationErr("Mismatch in delta index in task result " + task.getTaskId());
    }
    else {
      try {
        let contractParams = await this._contractApi.getContractParams(contractAddress);
        res = this._verifyHashesParams(
          contractParams.deltaHashes[deltaKey],
          contractParams.codeHash,
          task);
      }
      catch (e) {
        res.isVerified = false;
        res.error = e;
      }
    }
    return res;
  }

  async _checkComputeResult(taskParams, task, contractAddress) {
    let res = {};

    const deltaKey = task.getDelta().key;
    try {
      let contractParams = await this._contractApi.getContractParams(contractAddress);
      res = this._verifyHashesParams(
        contractParams.deltaHashes[deltaKey],
        taskParams.outputHash,
        task);
    }
    catch (e) {
      res.isVerified = false;
      res.error = e;
    }
    return res;
  }

  /**
   * Verify that the worker address is in the selected workers group for the given secret contract address
   * @param {string} secretContractAddress - Secret contract address
   * @param {string} workerAddress - Worker address
   * @param {JSON} params - task epoch params
   * @return {{isVerified: boolean, error: null}} : isVerified - true if the worker is in the selected group
   *                   err - null or Error Class
   */
  _verifySelectedWorker(secretContractAddress, workerAddress, params) {
    let result = {error: null, isVerified: true};
    let selectedWorker = EthereumVerifier.selectWorkerGroup(secretContractAddress, params, 1)[0];
    selectedWorker = nodeUtils.remove0x(selectedWorker.toLowerCase());
    if (selectedWorker !== workerAddress) {
      const err = new errors.WorkerSelectionVerificationErr("Not the selected worker for the " + secretContractAddress + " task");
      result.error = err;
      result.isVerified = false;
    }
    return result;
  }

  /**
   * Select the workers weighted-randomly based on the staked token amount that will run the computation task
   *
   * @param {string} scAddr - Secret contract address
   * @param {Object} params - Worker params
   * @param {number} workerGroupSize - Number of workers to be selected for task
   * @return {Array} An array of selected workers where each selected worker is chosen with probability equal to
   * number of staked tokens
   */
  static selectWorkerGroup(secretContractAddress, params, workerGroupSize) {
    // Find total number of staked tokens for workers
    const tokenCpt = params.balances.reduce((a, b) => JSBI.add(a, b), JSBI.BigInt(0));
    let nonce = 0;
    const selectedWorkers = [];
    do {
      // Unique hash for epoch, secret contract address, and nonce
      const hash = cryptography.hash(abi.rawEncode(
          ['uint256', 'bytes32', 'uint256'],
          [params.seed.toString(10), nodeUtils.add0x(secretContractAddress), nonce]
        ));

      // Find random number between [0, tokenCpt)
      let randVal = JSBI.remainder(cryptography.toBN(hash), tokenCpt);
      let selectedWorker = params.workers[params.workers.length - 1];
      // Loop through each worker, subtracting worker's balance from the random number computed above. Once the
      // decrementing randVal becomes negative, add the worker whose balance caused this to the list of selected
      // workers. If worker has already been selected, increase nonce by one, resulting in a new hash computed above.
      for (let i = 0; i < params.workers.length; i++) {
        randVal = JSBI.subtract(randVal, params.balances[i]);
        if (randVal <= 0) {
          selectedWorker = params.workers[i];
          break;
        }
      }
      if (!selectedWorkers.includes(selectedWorker)) {
        selectedWorkers.push(selectedWorker);
      }
      nonce++;
    }
    while (selectedWorkers.length < workerGroupSize);
    return selectedWorkers;
  }

  /**
   * Verify task creation
   * @param {string} deltaHash - from remote
   * @param {string} outputHash - from remote
   * @param {Task} task to verify
   * @return {JSON} error
   *                isVerified - true/false
   */
  _verifyTaskCreateParams(inputsHash, task) {
    let res = {};
    let paramsArray = [];
    if (task instanceof DeployTask) {
      paramsArray = [task.getEncryptedFn(), task.getEncyptedArgs(), cryptography.hash(task.getPreCode()), task.getUserDHKey()];
    }
    else {
      paramsArray = [task.getEncryptedFn(), task.getEncyptedArgs(), task.getContractAddr(), task.getUserDHKey()];
    }
    if (cryptography.hashArray(paramsArray) === inputsHash) {
      res.isVerified = true;
      res.error = null;
    }
    else {
      res.isVerified = false;
      res.error = new errors.TaskVerificationErr("Mismatch in inputs hash in task record " + task.getTaskId());
    }
    return res;
  }

  /**
   * Verify task submission
   * @param {string} deltaHash - from remote
   * @param {integer} deltaIndex - from remote
   * @param {string} outputHash - from remote
   * @param {Task} task to verify
   * @return {JSON} error
   *                isVerified - true/false
   */
  _verifyTaskResultsParams(deltaHash, deltaIndex, outputHash, task) {
    let res = {};

    if (deltaIndex === task.getDelta().key) {
      return this._verifyHashesParams(deltaHash, outputHash, task);
    }

    res.isVerified = false;
    res.error = new errors.TaskVerificationErr("Mismatch in deltaHash index in task result " + task.getTaskId());

    return res;
  }

  /**
   * Verify task result hashes
   * @param {string} deltaHash - from remote
   * @param {string} outputHash - from remote
   * @param {Task} task to verify
   * @return {JSON} error
   *                isVerified - true/false
   */
  _verifyHashesParams(deltaHash, outputHash, task) {
    let res = {isVerified: false};

    if (cryptography.hash(task.getOutput()) === outputHash) {
      if (cryptography.hash(task.getDelta().data) === deltaHash) {
        res.isVerified = true;
        res.error = null;
      }
      else {
        res.error = new errors.TaskVerificationErr("Mismatch in deltaHash in task result " + task.getTaskId());
      }
    }
    else {
      res.error = new errors.TaskVerificationErr("Mismatch in outputHash in task result " + task.getTaskId());
    }
    return res;
  }

  _findWorkerParamForTask(blockNumber) {
    if ((this._workerParamArray.length === 0) || (!blockNumber)) {
      return null;
    }

    let index = this._workerParamArray.length - 1;

    while (index >= 0) {
      if (blockNumber > this._workerParamArray[index].firstBlockNumber) {
        return this._workerParamArray[index];
      }
      index--;
    }
    return null;
  }

  _newEpochEventCallback(err, event) {
    if (err) {
      this._logger.error('an error occurred while listening to new epoch event. Error=' + err);
    }
    else {
      if (!this._validateWorkerParams(event)) {
        this._logger.error('Worker params received are not valid, ignoring them.. params=' + JSON.stringify(event));
      }
      else {
        this._workerParamArray.push(event);
        if (this._workerParamArray.length > this._workerParamArrayMaxSize) {
          this._workerParamArray.shift();
        }
      }
    }
  }

  _taskCreationEventCallback(err, event) {
    if (err) {
      this._logger.error('an error occurred while listening to task creation event. Error=' + err);
    }
    else {
      const unverifiedTaskIds = this._getAllTaskCreationIds();

      for (let taskId of unverifiedTaskIds) {
        if (('taskId' in event) && (event.taskId === taskId)) {
          let callback = this._getTaskCreationListener(taskId);
          this.deleteTaskCreationListener(taskId);
          return callback(event);
        }
        else if (('tasks' in event) && (taskId in event.tasks)) {
            let callback = this._getTaskCreationListener(taskId);
            this.deleteTaskCreationListener(taskId);
            return callback(event.tasks[taskId]);
          }
        }
      }
  }

  _taskSubmissionEventCallback(err, event) {
    if (err) {
      this._logger.error('an error occurred while listening to task submission event. Error=' + err);
    }
    else {
      const unverifiedTaskIds = this._getAllTaskSubmissionIds();
      for (let taskId of unverifiedTaskIds) {
        if (event.taskId === taskId) {
          let callback = this._getTaskSubmissionListener(taskId);
          this.deleteTaskCreationListener(taskId);
          return callback(event);
        }
      }
    }
  }

  _taskDeployedContractEventCallback(err, event) {
    if (err) {
      this._logger.error('an error occurred while listening to deploy secret contract event. Error=' + err);
    }
    else {
      const unverifiedTaskIds = this._getAllTaskSubmissionIds();
      for (let taskId of unverifiedTaskIds) {
        if (event.secretContractAddress === taskId) {
          let callback = this._getTaskSubmissionListener(taskId);
          this.deleteTaskCreationListener(taskId);
          return callback(event);
        }
      }
    }
  }

  async _updateWorkerParamNow() {
    let workerParamArray = await this._contractApi.getWorkersParams();
    // validate workers params
    for (let i = 1; i < workerParamArray.length; i++) {
      if (!this._validateWorkerParams(workerParamArray[i])) {
        this._logger.error('Worker params are not valid, ignoring them.. index=' + index + ' params=' + JSON.stringify(workerParamArray[i]));
        return;
      }
    }
    this._workerParamArray = this._sortWorkerParams(workerParamArray);
    // Note that if in any case, the array wasn't empty, due to an event received just before this call,
    // if we retrieve the info from Ethereum afterwards, it's ok to override the array, as the data will be there already
  }

  _sortWorkerParams(workerParamArray) {
    // first find the smallest item
    let smallestBlockIndex = 0;
    if (workerParamArray.length <= 1) {
      return workerParamArray;
    }
    for (let i = 1; i < workerParamArray.length; i++) {
      if (workerParamArray[i].firstBlockNumber < workerParamArray[i-1].firstBlockNumber) {
        smallestBlockIndex = i;
        break;
      }
    }
    if (smallestBlockIndex === 0) {
      return workerParamArray;
    }
    for (let i = 0; i < smallestBlockIndex; i++) {
      const element = workerParamArray.shift();
      workerParamArray.push(element);
    }
    return workerParamArray;
  }

  _validateWorkerParams(params) {
    return ('firstBlockNumber' in params);
  }
}


module.exports = EthereumVerifier;
