const Web3 = require('web3');
const DbUtils = require('../common/DbUtils');
const FailedResult  = require('../worker/tasks/Result').FailedResult;
const DeployTask  = require('../worker/tasks/DeployTask');
const DeployResult  = require('../worker/tasks/Result').DeployResult;

const constants = require('../common/constants');
const errors = require('../common/errors');

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
    this._epochSize = null;
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
      this._createTaskCreationListener(task, workerAddress, resolve);
      this._verifyTaskCreationNow(task, async (res, taskParams) => {
        if (res.canBeVerified) {
          this.deleteTaskCreationListener(task.getTaskId());
          if (res.isVerified) {
            let res2 = await this.verifySelectedWorker(task, taskParams.blockNumber, workerAddress);
            return resolve({error: res2.error, isVerified: res2.isVerified, gasLimit: taskParams.gasLimit});
          }
          return resolve({error: res.error, isVerified: false, gasLimit: null});
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
  verifyTaskSubmission(task) {
    return new Promise((resolve) => {
      this._createTaskSubmissionListener(task, resolve);
      this._verifyTaskSubmissionNow(task, (res) => {
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
      if (params === null) {
        const err = new errors.TaskValidityErr("Epoch params are missing for the task " + task.getTaskId());
        resolve({error: err, isVerified: false});
      }
      let secretContractAddress;
      if (task instanceof DeployTask) {
        secretContractAddress = task.getTaskId();
      }
      else { // (task instanceof ComputeTask)
        secretContractAddress = task.getContractAddr();
      }
      const res = this._verifySelectedWorker(secretContractAddress, workerAddress, params);
      resolve({error: res.error, isVerified: res.isVerified});
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
            if (event.type != constants.ETHEREUM_EVENTS.SecretContractDeployment) {
              const err = new errors.TaskValidityErr('Wrong event received (=' + event.type + ') for task ' + taskId);
              resolve({error:err, isVerified: false});
            }
            else {
              const res = this._verifyTaskResultsParams(event.stateDeltaHash, event.codeHash, task);
              resolve({error: res.error, isVerified: res.isVerified});
            }
          }
          else { //task instanceof ComputeResult
            if (event.type != constants.ETHEREUM_EVENTS.TaskSuccessSubmission) {
              const err = new errors.TaskValidityErr('Wrong event received (=' + event.type + ') for task ' + taskId);
              resolve({error:err, isVerified: false});
            }
            else {
              const res = this._verifyTaskResultsParams(event.stateDeltaHash, event.outputHash, task);
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
  async _verifyTaskCreationNow(task, callback) {
    let res = {};
    const taskId = task.getTaskId();
    const taskParams = await this._contractApi.getTaskParams(taskId);

    if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECORD_CREATED) {
      res = await this._verifyTaskCreateParams(taskParams.inputsHash, task);
      res.canBeVerified = true;
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
    return callback(res, taskParams);
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

  /**
   * Verify that the worker address is in the selected workers group for the given secret contract address
   * @param {string} secretContractAddress - Secret contract address
   * @param {string} workerAddress - Worker address
   * @param {JSON} params - task epoch params
   * @return {JSON} : {Boolean} isVerified - true if the worker is in the selected group
   *                   err - null or Error Class
   */
  _verifySelectedWorker(secretContractAddress, workerAddress, params) {
    // In order to not be bound to Ethereum, we create a new web3 instance here and not use the
    // EnigmaContractApi instance
    const web3 = new Web3();
    const selectedWorker = EthereumVerifier.selectWorkerGroup(secretContractAddress, params, web3, 1)[0];
    if (selectedWorker.signer === workerAddress) {
      return {error: null, isVerified: true};
    }
    const err = new errors.WorkerSelectionVerificationErr("Not the selected worker for the " + secretContractAddress + " task");
    return {error: err, isVerified: false};
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
    //TODO: implement this!!!! + add UT
    return {isVerified: true, error: null};
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

  _findWorkerParamForTask(blockNumber) {
    if ((this._workerParamArray.length <= 0) || (!blockNumber)) {
      return null;
    }

    const index = Math.floor((blockNumber - this._workerParamArray[0].firstBlockNumber) / this._epochSize);
    if ((index >= this._workerParamArray.length) || (index < 0)) {
      return null;
    }
    return this._workerParamArray[index];
  }

  _newEpochEventCallback(err, event) {
    if (err) {
      this._logger.error('an error occurred while listening to new epoch event. Error=' + err);
    }
    else {
      this._workerParamArray.push(event);
      if (this._workerParamArray.length > this._workerParamArrayMaxSize) {
        this._workerParamArray.shift();
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
    let workerParamArray = await this._contractApi.getAllWorkerParams();
    this._workerParamArray = this._sortWorkerParams(workerParamArray);
    this._epochSize = await this._contractApi.getEpochSize();
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
}


module.exports = EthereumVerifier;
