const defaultsDeep = require("@nodeutils/defaults-deep");
const DbUtils = require("../common/DbUtils");
const Task = require("../worker/tasks/Task");
const DeployTask = require("../worker/tasks/DeployTask");
const constants = require("../common/constants");
const cryptography = require("../common/cryptography");
const JSBI = require("jsbi");
const abi = require("ethereumjs-abi");
const errors = require("../common/errors");
const nodeUtils = require("../common/utils");

const result = require("../worker/tasks/Result");
const Result = result.Result;
const DeployResult = result.DeployResult;
const FailedResult = result.FailedResult;

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
    this._unverifiedCreateTasks = {}; // Maps a taskId to an object containing a callback and a block number (for t.o handling)
    this._unverifiedSubmitTasks = {}; // Maps a taskId to an object containing a callback and a block number (for t.o handling)
    this._taskTimeoutInBlocks = 0;
  }

  /**
   * Init the API
   */
  async init() {
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.NewEpoch, this._newEpochEventCallback.bind(this));
    await this._updateWorkerParamNow();
    this._taskTimeoutInBlocks = await this._contractApi.getTaskTimeout();
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.TaskCreation, this._taskCreationEventCallback.bind(this));
    this._ethereumServices.on(constants.ETHEREUM_EVENTS.TaskCancelled, this._taskCreationEventCallback.bind(this));
    this._ethereumServices.on(
      constants.ETHEREUM_EVENTS.TaskSuccessSubmission,
      this._taskSubmissionEventCallback.bind(this)
    );
    this._ethereumServices.on(
      constants.ETHEREUM_EVENTS.TaskFailureSubmission,
      this._taskSubmissionEventCallback.bind(this)
    );
    this._ethereumServices.on(
      constants.ETHEREUM_EVENTS.TaskFailureDueToEthereumCB,
      this._taskSubmissionEventCallback.bind(this)
    );
    this._ethereumServices.on(
      constants.ETHEREUM_EVENTS.SecretContractDeployment,
      this._taskDeployedContractEventCallback.bind(this)
    );
  }

  /**
   * Verify task creation
   * @param {Task} task to verify
   * @param {integer} block number representing the timestamp of the received task
   * @param {string} workerAddress
   * @return {Promise} returning {JSON} {Boolean} isVerified - true/false if the task verified,
   *                                    {Error} error
   *                                    {Integer} blockNumber
   *                                    {Integer} gasLimit
   */
  verifyTaskCreation(task, blockNumber, workerAddress) {
    return new Promise(async resolve => {
      let result = {
        isVerified: false,
        gasLimit: null,
        blockNumber: null,
        error: null
      };
      if (!(task instanceof Task)) {
        result.error = new errors.TypeErr("Wrong task type");
        return resolve(result);
      }
      if (!DbUtils.isValidEthereumAddress(workerAddress)) {
        result.error = new errors.TypeErr("Worker address is not a valid Ethereum address");
        return resolve(result);
      }
      this._createTaskCreationListener(task, blockNumber, workerAddress, resolve);
      const res = await this._verifyTaskCreationNow(task);
      if (res.canBeVerified) {
        this.deleteTaskCreationListener(task.getTaskId());
        if (res.isVerified) {
          const res2 = await this.verifySelectedWorker(task, res.taskParams.blockNumber, workerAddress);
          result.error = res2.error;
          result.isVerified = res2.isVerified;
          result.gasLimit = res.taskParams.gasLimit;
          result.blockNumber = res.taskParams.blockNumber;
        } else {
          result.error = res.error;
        }
        resolve(result);
      }
    });
  }

  /**
   * Verify task submission
   * @param {Task} task to verify
   * @param {String} contractAddress
   * @param {Object} localTip {address,key,data} which required to verify computations without state change
   * @return {Promise} returning {JSON} {Boolean} isVerified - true/false if the task verified,
   *                                    {Error} error
   */
  verifyTaskSubmission(task, blockNumber, contractAddress, localTip) {
    return new Promise(async resolve => {
      let result = { isVerified: false, error: null };
      if (!(task instanceof Result)) {
        result.error = new errors.TypeErr("Wrong task result type");
        return resolve(result);
      }
      this._createTaskSubmissionListener(task, blockNumber, resolve);
      const res = await this._verifyTaskSubmissionNow(task, contractAddress, localTip);
      if (res.canBeVerified) {
        this.deleteTaskSubmissionListener(task.getTaskId());
        resolve({ error: res.error, isVerified: res.isVerified });
      }
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
    return new Promise(resolve => {
      let secretContractAddress = task.getContractAddr();
      const res = this._verifySelectedWorker(secretContractAddress, workerAddress, blockNumber);
      return resolve({ error: res.error, isVerified: res.isVerified });
    });
  }

  _createTaskCreationListener(task, blockNumber, workerAddress, resolve) {
    const taskId = task.getTaskId();
    this._setTaskCreationListener(taskId, blockNumber, async event => {
      // Check if the new epoch event was sent, if so, it means that the task callback has timed out
      if (event.type === constants.ETHEREUM_EVENTS.NewEpoch) {
        const err = new errors.TaskTimeoutErr("Task " + taskId + " timed out");
        return resolve({
          error: err,
          isVerified: false,
          gasLimit: null,
          blockNumber: null
        });
      }
      // Check if the task was cancelled
      if (event.type === constants.ETHEREUM_EVENTS.TaskCancelled) {
        const err = new errors.TaskCancelledErr("Task " + taskId + " was cancelled");
        return resolve({
          error: err,
          isVerified: false,
          gasLimit: null,
          blockNumber: null
        });
      }
      const res = this._verifyTaskCreateParams(event.inputsHash, task);
      if (res.isVerified) {
        const res2 = await this.verifySelectedWorker(task, event.blockNumber, workerAddress);
        return resolve({
          error: res2.error,
          isVerified: res2.isVerified,
          gasLimit: event.gasLimit,
          blockNumber: event.blockNumber
        });
      }
      return resolve({
        error: res.error,
        isVerified: res.isVerified,
        gasLimit: null,
        blockNumber: null
      });
    });
  }

  _setTaskCreationListener(taskId, blockNumber, listener) {
    this._unverifiedCreateTasks[taskId] = {
      blockNumber: blockNumber,
      listener: listener
    };
  }

  _getTaskCreationListener(taskId) {
    return this._unverifiedCreateTasks[taskId];
  }

  _getAllTaskCreationIds() {
    return Object.keys(this._unverifiedCreateTasks);
  }

  _createTaskSubmissionListener(task, blockNumber, resolve) {
    const taskId = task.getTaskId();
    this._setTaskSubmissionListener(taskId, blockNumber, event => {
      // First check if the new epoch event was sent, if so, it means that the task callback has timed out
      if (event.type === constants.ETHEREUM_EVENTS.NewEpoch) {
        const err = new errors.TaskTimeoutErr("Task " + taskId + " timed out");
        resolve({ error: err, isVerified: false });
      }
      // then check if its an event indicating of an Ethereum callback failure
      else if (event.type === constants.ETHEREUM_EVENTS.TaskFailureDueToEthereumCB) {
        const err = new errors.TaskEthereumFailureErr("Task " + taskId + " was failed due to Ethereum");
        resolve({ error: err, isVerified: false });
      }
      // Verify the case of a FailedResult
      else if (task instanceof FailedResult) {
        if (event.type === constants.ETHEREUM_EVENTS.TaskFailureSubmission) {
          resolve({ error: null, isVerified: true });
        } else {
          const err = new errors.TaskValidityErr("Task " + taskId + " did not fail");
          resolve({ error: err, isVerified: false });
        }
      } else {
        // Task isinstanceof TaskResult
        if (event.type === constants.ETHEREUM_EVENTS.TaskFailureSubmission) {
          // task failure is not expected
          const err = new errors.TaskFailedErr("Task " + taskId + " has failed");
          resolve({ error: err, isVerified: false });
        } else {
          if (task instanceof DeployResult) {
            if (event.type !== constants.ETHEREUM_EVENTS.SecretContractDeployment) {
              const err = new errors.TaskValidityErr("Wrong event received (=" + event.type + ") for task " + taskId);
              resolve({ error: err, isVerified: false });
            } else {
              const res = this._checkDeployResult(task, event.stateDeltaHash, event.codeHash);
              resolve({ error: res.error, isVerified: res.isVerified });
            }
          } else {
            //task instanceof ComputeResult
            if (event.type !== constants.ETHEREUM_EVENTS.TaskSuccessSubmission) {
              const err = new errors.TaskValidityErr("Wrong event received (=" + event.type + ") for task " + taskId);
              resolve({ error: err, isVerified: false });
            } else {
              const res = this._checkComputeResultEvent(
                task,
                event.outputHash,
                event.stateDeltaHash,
                event.stateDeltaHashIndex
              );
              resolve({ error: res.error, isVerified: res.isVerified });
            }
          }
        }
      }
    });
  }

  _setTaskSubmissionListener(taskId, blockNumber, listener) {
    this._unverifiedSubmitTasks[taskId] = {
      blockNumber: blockNumber,
      listener: listener
    };
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
   * @return {Object} error
   *                canBeVerified - true/false if the task can be verified at the moment
   *                isVerified - true/false is the task can be verified now, null otherwise
   */
  _verifyTaskCreationNow(task) {
    return new Promise(async resolve => {
      let res = {};
      const taskId = task.getTaskId();

      try {
        res.taskParams = await this._contractApi.getTaskParams(taskId);
      } catch (e) {
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
      } else if (res.taskParams.status === constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED) {
        res.canBeVerified = false;
        res.isVerified = null;
        res.error = null;
      } else {
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
   * @param {String} contractAddress
   * @param {Object} localTip {address,key,data} which required to verify computations without state change
   * @return {JSON} error
   *                canBeVerified - true/false if the task can be verified at the moment
   *                isVerified - true/false is the task can be verified now, null otherwise
   */
  async _verifyTaskSubmissionNow(task, contractAddress, localTip) {
    return new Promise(async resolve => {
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
            let result = {};
            let contractParams = null;
            try {
              contractParams = await this._contractApi.getContractParams(contractAddress);
              if (!contractParams.deltaHashes) {
                res.isVerified = false;
                res.error = new errors.TaskValidityErr(
                  `Failure in verification of task ${taskId}: no delta hashes for contract ${contractAddress}`
                );
              }
            } catch (e) {
              res.isVerified = false;
              res.error = new errors.TaskValidityErr(`Failure in verification of task ${taskId}: ${e}`);
            }
            if (!res.error) {
              if (task instanceof DeployResult) {
                result = this._checkDeployResult(task, contractParams.deltaHashes[0], contractParams.codeHash);
              } else {
                result = this._checkComputeResult(taskParams, contractParams, task, contractAddress, localTip);
              }
              res.isVerified = result.isVerified;
              res.error = result.error;
            }
          }
        } else if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED) {
          res.canBeVerified = true;

          if (task instanceof FailedResult) {
            res.isVerified = true;
            res.error = null;
          } else {
            res.isVerified = false;
            res.error = new errors.TaskFailedErr(`Task ${taskId} has failed`);
          }
        } else if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED_ETH) {
          res.canBeVerified = true;
          res.isVerified = false;
          res.error = new errors.TaskEthereumFailureErr("Task " + taskId + " was failed due to Ethereum");
        } else if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED_CANCELLED) {
          res.canBeVerified = true;
          res.isVerified = false;
          res.error = new errors.TaskValidityErr(
            `Failure in verification of task ${taskId}: task was cancelled by the user`
          );
        } else if (taskParams.status === constants.ETHEREUM_TASK_STATUS.RECORD_CREATED) {
          // If the task was created already, use its mined block number instead for the timeout calculations
          if (taskId in this._getAllTaskSubmissionIds()) {
            let { listener, blockNumber } = this._getTaskSubmissionListener(taskId);
            this._setTaskSubmissionListener(taskId, taskParams.blockNumber, listener);
          }
        } else {
          // taskParams.status === RECORD_UNDEFINED
          res.canBeVerified = false;
          res.isVerified = null;
          res.error = null;
        }
      } catch (e) {
        this._logger.info(`error received while trying to verify result of task taskId ${taskId}: ${e}`);
        // TODO: consider adding a retry mechanism
        res.canBeVerified = true;
        res.isVerified = false;
        res.error = e;
      }
      return resolve(res);
    });
  }

  _checkDeployResult(task, deltaHash, codeHash) {
    let res = { isVerified: false, error: null };

    if (!task.hasDelta()) {
      res.error = new errors.TaskVerificationErr("No delta in task result " + task.getTaskId());
    } else {
      const deltaKey = task.getDelta().key;
      if (deltaKey !== 0) {
        res.error = new errors.TaskVerificationErr("Mismatch in delta index in task result " + task.getTaskId());
      } else {
        if (!EthereumVerifier._verifyHash(deltaHash, task.getDelta().data)) {
          res.error = new errors.TaskVerificationErr("Mismatch in delta hash in task result " + task.getTaskId());
        } else if (!EthereumVerifier._verifyHash(codeHash, task.getOutput())) {
          res.error = new errors.TaskVerificationErr("Mismatch in output hash in task result " + task.getTaskId());
        }
        // All fine
        else {
          res.isVerified = true;
        }
      }
    }
    return res;
  }

  _checkComputeResult(taskParams, contractParams, task, contractAddress, localTip) {
    let isVerified = false;
    let error = null;
    // Delta
    if (task.hasDelta()) {
      const deltaKey = task.getDelta().key;

      if (deltaKey >= contractParams.deltaHashes.length) {
        error = new errors.TaskVerificationErr("Wrong delta index in task result " + task.getTaskId());
      }
      if (!EthereumVerifier._verifyHash(contractParams.deltaHashes[deltaKey], task.getDelta().data)) {
        error = new errors.TaskVerificationErr("Mismatch in delta hash in task result " + task.getTaskId());
      }
    }
    // No delta
    else {
      const lastDeltaIndex = contractParams.deltaHashes.length - 1;
      if (lastDeltaIndex !== localTip.key) {
        error = new errors.TaskVerificationErr(
          "Mismatch in last local tip index (no state change) for task " + task.getTaskId()
        );
      } else if (!EthereumVerifier._verifyHash(contractParams.deltaHashes[lastDeltaIndex], localTip.data)) {
        error = new errors.TaskVerificationErr(
          "Mismatch in last local tip hash (no state change) for task " + task.getTaskId()
        );
      }
    }
    // All fine by now...
    if (!error) {
      let output = task.getOutput();
      if (!EthereumVerifier._verifyHash(taskParams.outputHash, output)) {
        error = new errors.TaskVerificationErr("Mismatch in output hash in task result " + task.getTaskId());
      } else {
        isVerified = true;
      }
    }
    return {
      isVerified: isVerified,
      error: error
    };
  }

  _checkComputeResultEvent(task, outputHash, deltaHash, deltaIndex) {
    let isVerified = false;
    let error = null;
    // Delta
    if (task.hasDelta()) {
      const deltaKey = task.getDelta().key;

      if (deltaKey !== deltaIndex) {
        error = new errors.TaskVerificationErr("Wrong delta index in task result " + task.getTaskId());
      }
      if (!EthereumVerifier._verifyHash(deltaHash, task.getDelta().data)) {
        error = new errors.TaskVerificationErr("Mismatch in delta hash in task result " + task.getTaskId());
      }
    }
    // No delta
    else {
      if (deltaHash !== constants.ETHEREUM_EMPTY_HASH) {
        error = new errors.TaskVerificationErr(
          `Mismatch in delta - task " + ${task.getTaskId()} does not contain a delta`
        );
      }
    }
    // All fine by now...
    if (!error) {
      let output = task.getOutput();
      if (!EthereumVerifier._verifyHash(outputHash, output)) {
        error = new errors.TaskVerificationErr("Mismatch in output hash in task result " + task.getTaskId());
      } else {
        isVerified = true;
      }
    }
    return {
      isVerified: isVerified,
      error: error
    };
  }

  /**
   * Verify that the worker address is in the selected workers group for the given secret contract address
   * @param {string} secretContractAddress - Secret contract address
   * @param {string} workerAddress - Worker address
   * @param {number} blockNumber - task creation blockNumber
   * @return {{isVerified: boolean, error: null}} : isVerified - true if the worker is in the selected group
   *                   err - null or Error Class
   */
  async _verifySelectedWorker(secretContractAddress, workerAddress, blockNumber) {
    const result = { error: null, isVerified: true };
    let [selectedWorker] = await EthereumVerifier.selectWorkerGroup(
      this._contractApi,
      secretContractAddress,
      blockNumber,
      1
    );
    selectedWorker = nodeUtils.remove0x(selectedWorker.toLowerCase());
    if (selectedWorker !== workerAddress) {
      const err = new errors.WorkerSelectionVerificationErr(
        "Not the selected worker for the " + secretContractAddress + " task"
      );
      result.error = err;
      result.isVerified = false;
    }
    return result;
  }

  /**
   * Select the workers weighted-randomly based on the staked token amount that will run the computation task
   *
   * @param {string} scAddr - Secret contract address
   * @param {number} blockNumber - Task creation block number
   * @return {Promise<Array>} An array of selected workers where each selected worker is chosen with probability equal to
   * number of staked tokens
   */
  static async selectWorkerGroup(api, secretContractAddress, blockNumber) {
    return await api.getWorkerGroup(secretContractAddress, blockNumber);
  }

  _findWorkerParamForTask(blockNumber) {
    if (this._workerParamArray.length === 0 || !blockNumber) {
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
      this._logger.error("an error occurred while listening to new epoch event. Error=" + err);
    } else {
      if (!this._validateWorkerParams(event)) {
        this._logger.error("Worker params received are not valid, ignoring them.. params=" + JSON.stringify(event));
      } else {
        this._workerParamArray.push(event);
        if (this._workerParamArray.length > this._workerParamArrayMaxSize) {
          this._workerParamArray.shift();
        }
        this._checkTimeouts(event);
      }
    }
  }

  _taskCreationEventCallback(err, event) {
    if (err) {
      this._logger.error("an error occurred while listening to task creation event. Error=" + err);
    } else {
      const unverifiedTaskIds = this._getAllTaskCreationIds();

      for (let taskId of unverifiedTaskIds) {
        if ("taskId" in event && event.taskId === taskId) {
          let { listener, blockNumber } = this._getTaskCreationListener(taskId);
          this.deleteTaskCreationListener(taskId);
          return listener(event);
        } else if ("tasks" in event && taskId in event.tasks) {
          let { listener, blockNumber } = this._getTaskCreationListener(taskId);
          this.deleteTaskCreationListener(taskId);
          return listener(event.tasks[taskId]);
        }
      }
    }
  }

  _taskSubmissionEventCallback(err, event) {
    if (err) {
      this._logger.error("an error occurred while listening to task submission event. Error=" + err);
    } else {
      const unverifiedTaskIds = this._getAllTaskSubmissionIds();
      for (let taskId of unverifiedTaskIds) {
        if (event.taskId === taskId) {
          let { listener, blockNumber } = this._getTaskSubmissionListener(taskId);
          this.deleteTaskSubmissionListener(taskId);
          return listener(event);
        }
      }
    }
  }

  _taskDeployedContractEventCallback(err, event) {
    if (err) {
      this._logger.error("an error occurred while listening to deploy secret contract event. Error=" + err);
    } else {
      const unverifiedTaskIds = this._getAllTaskSubmissionIds();
      for (let taskId of unverifiedTaskIds) {
        if (event.secretContractAddress === taskId) {
          let { listener, blockNumber } = this._getTaskSubmissionListener(taskId);
          this.deleteTaskSubmissionListener(taskId);
          return listener(event);
        }
      }
    }
  }

  async _updateWorkerParamNow() {
    let workerParamArray = await this._contractApi.getWorkersParams();
    // validate workers params
    for (let i = 1; i < workerParamArray.length; i++) {
      if (!this._validateWorkerParams(workerParamArray[i])) {
        this._logger.error(
          "Worker params are not valid, ignoring them.. index=" +
            index +
            " params=" +
            JSON.stringify(workerParamArray[i])
        );
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
      if (workerParamArray[i].firstBlockNumber < workerParamArray[i - 1].firstBlockNumber) {
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
    return "firstBlockNumber" in params;
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
      paramsArray = [
        task.getEncryptedFn(),
        task.getEncryptedArgs(),
        cryptography.hash(task.getPreCode()),
        task.getUserDHKey()
      ];
    } else {
      paramsArray = [task.getEncryptedFn(), task.getEncryptedArgs(), task.getContractAddr(), task.getUserDHKey()];
    }
    if (cryptography.hashArray(paramsArray) === inputsHash) {
      res.isVerified = true;
      res.error = null;
    } else {
      res.isVerified = false;
      res.error = new errors.TaskVerificationErr("Mismatch in inputs hash in task record " + task.getTaskId());
    }
    return res;
  }

  _checkTimeouts(newEpochEvent) {
    // Timeouts handling => go through the listeners and check if there are callbacks to be removed

    // Unverified creation task
    let unverifiedTaskIds = this._getAllTaskCreationIds();
    for (let taskId of unverifiedTaskIds) {
      let { blockNumber, listener } = this._getTaskCreationListener(taskId);
      if (newEpochEvent.firstBlockNumber - blockNumber >= this._taskTimeoutInBlocks) {
        this.deleteTaskCreationListener(taskId);
        listener(newEpochEvent);
      }
    }

    // Unverified submission task
    unverifiedTaskIds = this._getAllTaskSubmissionIds();
    for (let taskId of unverifiedTaskIds) {
      let { blockNumber, listener } = this._getTaskSubmissionListener(taskId);
      if (newEpochEvent.firstBlockNumber - blockNumber >= this._taskTimeoutInBlocks) {
        this.deleteTaskSubmissionListener(taskId);
        listener(newEpochEvent);
      }
    }
  }

  /**
   * Verify hash
   * @param {string} hash
   * @param {Array} data
   * @return isVerified - true/false
   */
  static _verifyHash(hash, data) {
    return cryptography.hash(data) === hash;
  }
}

module.exports = EthereumVerifier;
