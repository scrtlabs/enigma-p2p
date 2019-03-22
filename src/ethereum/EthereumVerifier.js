const defaultsDeep = require('@nodeutils/defaults-deep');
const DbUtils = require('../common/DbUtils');
const Task = require('../worker/tasks/Task');
const constants = require('../common/constants');
const cryptography = require('../common/cryptography');
const errors = require('../common/errors');

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
      console.log('-------- VERIFYSELECTEDWORKER ----------');
      console.log(params);
      if (typeof params === 'undefined' || params === null) {
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
              const res = this._verifyTaskResultsParams(event.stateDeltaHash, event.codeHash, task);
              resolve({error: res.error, isVerified: res.isVerified});
            }
          }
          else { //task instanceof ComputeResult
            if (event.type !== constants.ETHEREUM_EVENTS.TaskSuccessSubmission) {
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
          } else {
            let deltaHash;
            let outputHash;
            const deltaKey = task.getDelta().key;
            if (task instanceof DeployResult) {
              let contractParams = await this._contractApi.getContractParams(task.getTaskId());
              outputHash = contractParams.codeHash;
              deltaHash = await this._contractApi.getStateDeltaHash(task.getTaskId(), deltaKey);
            } else {
              outputHash = await this._contractApi.getOutputHash(contractAddress, deltaKey - 1);
              deltaHash = await this._contractApi.getStateDeltaHash(contractAddress, deltaKey);
            }
            const result = this._verifyTaskResultsParams(deltaHash, outputHash, task);
            res.isVerified = result.isVerified;
            res.error = result.error;
          }
        } else if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED) {
          if (task instanceof FailedResult) {
            res.canBeVerified = true;
            res.isVerified = true;
            res.error = null;
          } else {
            res.canBeVerified = true;
            res.isVerified = false;
            res.error = new errors.TaskFailedErr(`Task ${taskId} has failed`);
          }
        } else {
          res.canBeVerified = false;
          res.isVerified = null;
          res.error = null;
        }
        return resolve(res);
      } catch (e) {
        this._logger.info(`error received while trying to verify result of task taskId ${taskId}: ${e}`);
        // TODO: consider adding a retry mechanism
        res.canBeVerified = true;
        res.isVerified = false;
        res.error = e;
        return resolve(res);
      }
    });
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
    const selectedWorker = EthereumVerifier.selectWorkerGroup(secretContractAddress, params, 1)[0];
    console.log('workerAddress is '+workerAddress);
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
    const tokenCpt = params.balances.reduce((a, b) => a + b, 0);
    let nonce = 0;
    const selectedWorkers = [];

    console.log('^^^^^^^^^^^^^^^^ selectWorkerGroup ^^^^^^^^^^^^^^^^^^^^^^');
    console.log(secretContractAddress);
    console.log(params);
    console.log(workerGroupSize);

    do {
      // Unique hash for epoch, secret contract address, and nonce
      const hash = cryptography.soliditySha3(
        {t: 'uint256', v: params.seed},
        {t: 'bytes32', v: secretContractAddress},
        {t: 'uint256', v: nonce});

      // Find random number between [0, tokenCpt)
      let randVal = (cryptography.toBN(hash).mod(cryptography.toBN(tokenCpt))).toNumber();
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
    console.log(selectedWorkers);
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
      if (DbUtils.kecckak256Hash(task.getDelta().data) === deltaHash) {
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
    if ((this._workerParamArray.length === 0) || (!blockNumber)) {
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
      console.log("~~~~~~~~~~~~ newEpochEventCallback ~~~~~~~~~~~~~~~~~`")
      console.log(event);
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
    console.log('========= updateWorkerParamNow ==============');
    let workerParamArray = await this._contractApi.getAllWorkerParams();
    console.log(workerParamArray);
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
