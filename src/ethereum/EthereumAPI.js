const EventEmitter = require('events');
const Web3 = require('web3');
const DbUtils = require('../../common/DbUtils');
const FailedResult  = require('../../worker/tasks').FailedResult;

const constants = require('../../common/constants');
const errors = require('../../common/errors');

class EthereumAPI extends EventEmitter {
  /**
   * {EnigmaContractReaderAPI} enigmaContractAPI
   * {EthereumServices} ethereumServices
   * {Object} logger
   * */
  constructor(contractAPI, ethereumServices, logger) {
    super();
    this._logger = logger;
    this._contractApi = contractAPI;
    this._ethereumServices = ethereumServices;
    this._workerParam = null;
    this._unverifiedCreateTasks = {};
    this._unverifiedSubmitTasks = {};
  }

  /**
   * Init the API
   */
  async init() {
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.NewEpoch, this._newEpochEventCallback);
    await this._updateWorkerParamNow();
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.TaskCreation, this._taskCreationEventCallback);
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.TaskSuccessSubmission, this._taskSubmissionEventCallback);
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.TaskFailureSubmission, this._taskSubmissionEventCallback);
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.SecretContractDeployment, this._taskDeployedContractEventCallback);

  }

  /**
   * Verify task creation
   * @param {Task} task to verify
   * @return {Promise} returning {JSON}boolean - true/false if the task verified
   */
  verifyTaskCreation(task) {
    return new Promise((resolve) => {
      this._createTaskCreationListener(task, resolve);
      this._verifyTaskCreationNow(task, (res) => {
        if (res.canBeVerified) {
          this.deleteTaskCreationListener(task.getTaskId());
          resolve(res.isVerified);
        }
      });
    });
  }

  /**
   * Verify task submission
   * @param {Task} task to verify
   * @return {Promise} boolean - true/false if the task verified
   */
  verifyTaskSubmission(task) {
    return new Promise((resolve) => {
      this._createTaskSubmissionListener(task, resolve);
      this._verifyTaskSubmissionNow(task, (res) => {
        if (res.canBeVerified) {
          this.deleteTaskSubmissionListener(task.getTaskId());
          resolve(res.isVerified);
        }
      });
    });
  }

  deleteTaskCreationListener(taskId) {
    delete this._unverifiedCreateTasks[taskId];
  }

  deleteTaskSubmissionListener(taskId) {
    delete this._unverifiedSubmitTasks[taskId];
  }

  _createTaskCreationListener(task, resolve) {
    const taskId = task.getTaskId();
    this._setTaskCreationListener(taskId, (event) => {
      const res = this._verifyTaskCreateParams(event.inputsHash, task);
      resolve(res);
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
          resolve(null, true);
        }
        else {
          const err = new errors.TaskValidityErr('Task ' + taskId + ' did not fail');
          resolve(err, false);
        }
      }
      else { // Task isinstanceof TaskResult
        if (event.type === constants.ETHEREUM_EVENTS.TaskFailureSubmission) {
          // task failure is not expected
          const err = new errors.TaskFailedErr('Task ' + taskId + ' has failed');
          resolve(err, false);
          }
        else {
          const res = this._verifyTaskResultsParams(event.stateDeltaHash, event.codeHash, task);
          resolve(res.error, res.isVerified);
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
    return Object.keys(this._unverifiedCreateTasks);
  }

  /**
   * Checks whether the task can verified now and returns the verification result
   * @param {Task} task to verify
   * @return {JSON} error
   *                canBeVerified - true/false if the task can be verified at the moment
   *                isVerified - true/false is the task can be verified now, null otherwise
   */
  async _verifyTaskCreationNow(task, callback) {
    let res = {};
    const taskId = task.getTaskId();
    const taskParams = await this._contractApi.getTaskParams(taskId);

    if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECORD_CREATED) {
      res.canBeVerified = true;
      res.isVerified = await this._verifyTaskCreateParams(taskParams.inputsHash, task);
      res.error = null;
    }
    else if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED) {
      res.canBeVerified = false;
      res.isVerified = null;
      res.error = null;
    }
    else {
      res.canBeVerified = true;
      res.isVerified = false;
      res.error = new errors.TaskValidityErr('Task remote status is not expected (=' + taskParams.status + ')');
    }
    return callback(res);
  }

  /**
   * Checks whether the task can verified now and returns the verification result
   * @param {Task} task to verify
   * @return {JSON} error
   *                canBeVerified - true/false if the task can be verified at the moment
   *                isVerified - true/false is the task can be verified now, null otherwise
   */
  async _verifyTaskSubmissionNow(task, callback) {
    let res = {};
    const taskId = task.getTaskId();
    const taskParams = await this._contractApi.getTaskParams(taskId);

    if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED) {
      res.canBeVerified = true;

      if (task instanceof FailedResult) {
        res.isVerified = false;
        res.error = new errors.TaskValidityErr('Task ' + taskId + ' did not fail');
      }
      else {
        const result = await this._verifyTaskResultsParams(taskParams.deltaHash, taskParams.outputHash, task);
        res.isVerified = result.isVerified;
        res.error = result.error;
      }
    }
    else if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED) {
      if (task instanceof FailedResult) {
        res.canBeVerified = true;
        res.isVerified = true;
        res.error = null;
      }
      else {
        res.canBeVerified = true;
        res.isVerified = false;
        res.error = new errors.TaskFailedErr('Task ' + taskId + ' has failed');
      }
    }
    else {
      res.canBeVerified = false;
      res.isVerified = null;
      res.error =  null;
    }
    return callback(res);
  }

  // TODO: decide when (and how) to run the worker selection algorithm
  /**
   * Verify that the worker address is in the selected workers group for the given secret contract address
   * @param {string} secretContractAddress - Secret contract address
   * @param {string} workerAddress - Worker address
   * @return {Boolean} true if the worker is in the selected group
   */
  verifySelectedWorker(secretContractAddress, workerAddress) {
    // In order to not be bound to Ethereum, we create a new web3 instance here and not use the
    // EnigmaContractApi instance
    const web3 = new Web3();
    const selectedWorker = EthereumAPI.selectWorkerGroup(secretContractAddress, this._workerParam, web3, 1)[0];
    return (selectedWorker.signer === workerAddress);
  }

  /**
   * Select the workers weighted-randomly based on the staked token amount that will run the computation task
   *
   * @param {string} scAddr - Secret contract address
   * @param {Object} params - Worker params
   * @param {Object} web3
   * @param {number} workerGroupSize - Number of workers to be selected for task
   * @return {Array} An array of selected workers where each selected worker is chosen with probability equal to
   * number of staked tokens
   */
  static selectWorkerGroup(secretContractAddress, params, web3, workerGroupSize) {
    // Find total number of staked tokens for workers
    const tokenCpt = params.balances.reduce((a, b) => a + b, 0);
    let nonce = 0;
    const selectedWorkers = [];
    do {
      // Unique hash for epoch, secret contract address, and nonce
      const hash = web3.utils.soliditySha3(
          {t: 'uint256', v: params.seed},
          {t: 'bytes32', v: secretContractAddress},
          {t: 'uint256', v: nonce},
      );
      // Find random number between [0, tokenCpt)
      let randVal = (web3.utils.toBN(hash).mod(web3.utils.toBN(tokenCpt))).toNumber();
      let selectedWorker = params.workers[params.workers.length - 1];
      // Loop through each worker, subtracting worker's balance from the random number computed above. Once the
      // decrementing randVal becomes negative, add the worker whose balance caused this to the list of selected
      // workers. If worker has already been selected, increase nonce by one, resulting in a new hash computed above.
      for (let i = 0; i < params.workers.length; i++) {
        randVal -= params.balances[i];
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
    //TODO: ask Elihai
  }

  /**
   * Verify task submission
   * @param {string} deltaHash - from remote
   * @param {string} outputHash - from remote
   * @param {Task} task to verify
   * @return {JSON} error
   *                isVerified - true/false
   */
  _verifyTaskResultsParams(deltaHash, outputHash, task) {
    let res = {};

    if (DbUtils.kecckak256Hash(task.getOutput()) === outputHash) {
      if (DbUtils.kecckak256Hash(task.getDelta()) === deltaHash) {
        res.isVerified = true;
        res.error = null;
      }
      else {
        res.isVerified = false;
        res.error = new errors.TaskVerificationErr("Mismatch in deltaHash in task result " + task.getTaskId());
      }
    }
    else {
      res.isVerified = false;
      res.error = new errors.TaskVerificationErr("Mismatch in outputHash in task result " + task.getTaskId());
    }
    return res;
  }

  // _verifySecretContractParams(deltaHash, codeHash, task) {
  //   return ((DbUtils.kecckak256Hash(task.getPreCodeHash()) === codeHash) &&
  //     (DbUtils.kecckak256Hash(task.getDelta()) === deltaHash));
  // }

  // TODO
  _newEpochEventCallback(err, event) {
    if (err) {
      this._logger.error('an error occurred while listening to deploy secret contract event. Error=' + err);
    }
    else {

    }
  }

  _taskCreationEventCallback(err, event) {
    if (err) {
      this._logger.error('an error occurred while listening to task creation event. Error=' + err);
    }
    else {
      const unverifiedTaskIds = this._getAllTaskCreationIds();
      for (let taskId in unverifiedTaskIds) {
        if (('taskId' in event) && (event.taskId === taskId)) {
          let callback = this._getTaskCreationListener(taskId);
          this.deleteTaskCreationListener(taskId);
          callback(event);
        }
        else if (('taskIds' in event) && (taskId in Object.keys(event.tasks))) {
          let callback = this._getTaskCreationListener(taskId);
          this.deleteTaskCreationListener(taskId);
          return callback(event.tasks[taskId]);
        }
      }
    }
  }

  _taskSubmissionEventCallback() {
    if (err) {
      this._logger.error('an error occurred while listening to task submission event. Error=' + err);
    }
    else {
      const unverifiedTaskIds = this._getAllTaskSubmissionIds();
      for (let taskId in unverifiedTaskIds) {
        if (event.taskId === taskId) {
          let callback = this._getTaskSubmissionListener(taskId);
          this.deleteTaskCreationListener(taskId);
          return callback(event, false);
        }
      }
    }
  }

  _taskDeployedContractEventCallback() {
    if (err) {
      this._logger.error('an error occurred while listening to deploy secret contract event. Error=' + err);
    }
    else {
      const unverifiedTaskIds = this._getAllTaskSubmissionIds();
      for (let taskId in unverifiedTaskIds) {
        if (event.secretContractAddress === taskId) {
          let callback = this._getTaskSubmissionListener(taskId);
          this.deleteTaskCreationListener(taskId);
          return callback(event, true);
        }
      }
    }
  }

  async _updateWorkerParamNow() {
    const blockNumber = await this._contractApi.getBlockNumber();
    const getWorkerParamsResult = await this.getWorkerParams(blockNumber);
    this._workerParam = {
      firstBlockNumber: parseInt(getWorkerParamsResult[0]),
      seed: parseInt(getWorkerParamsResult[1]),
      workers: getWorkerParamsResult[2],
      balances: getWorkerParamsResult[3].map((x) => parseInt(x)),
    };
  }
}


module.exports = EthereumAPI;
