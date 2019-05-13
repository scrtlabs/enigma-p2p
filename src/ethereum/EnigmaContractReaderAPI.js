const errors = require('../common/errors');
const Logger = require('../common/logger');
const nodeUtils = require('../common/utils');
const cryptography = require('../common/cryptography');

// TODO:: delegate the configuration load to the caller from the outside + allow dynamic path (because the caller is responsible).
const config = require('./config.json');

class EnigmaContractReaderAPI {
  /**
   * {string} enigmaContractAddress
   * {Json} enigmaContractABI
   * {Web3} web3
   * */
  constructor(enigmaContractAddress, enigmaContractABI, web3, logger, workerAddress) {
    this._enigmaContract = new web3.eth.Contract(enigmaContractABI, enigmaContractAddress);
    this._web3 = web3;
    this._activeEventSubscriptions = {};
    this._initEventParsers();

    if (logger) {
      this._logger = logger;
    } else {
      this._logger = new Logger();
    }

    const conf = JSON.parse(JSON.stringify(config)); // deep copy

    this._defaultTrxOptions = conf.default;
    this._validTrxParams = conf.valid;

    if (workerAddress) {
      this._workerAddress = workerAddress;
      this._defaultTrxOptions.from = workerAddress;
    }
    else {
      this._workerAddress = null;
    }
  }
  w3() {
    return this._web3;
  }
  logger() {
    return this._logger;
  }
  getWorkerAddress() {
    return this._workerAddress;
  }
  /**
     * get a secret contract hash
     * @param {string} secrectContractAddress
     * @return {Promise} returning {JSON}: {string} owner, {string} preCodeHash, {string} codeHash,
     * {string} outputHash, {ETHEREUM_SECRET_CONTRACT_STATUS} status, {Array<string>} deltaHashes
     * */
  getContractParams(secrectContractAddress) {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.getSecretContract(secrectContractAddress).call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        const params = {
          owner: data.owner,
          preCodeHash: data.preCodeHash,
          codeHash: data.codeHash,
          status: parseInt(data.status),
          deltaHashes: data.stateDeltaHashes
        };
        resolve(params);
      });
    });
  }
  /**
   * count the number of deployed secret contracts
   * @return {Promise} number
   * */
  countSecretContracts() {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.countSecretContracts().call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        resolve(parseInt(data));
      });
    });
  }
  /**
   * return a list of addresses given a range
   * @param {Integer} from , including
   * @param {Integer} to , up to not including
   * @return {Promise} Array<string>
   * */
  getSecretContractAddresses(from, to) {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.getSecretContractAddresses(from, to).call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        resolve(data);
      });
    });
  }
  /**
     * Get the Worker parameters
     * @param {Integer} blockNumber //TODO:: check which time solidity expects, maybe BN ?
     * @return {Promise} //TODO:: what are the exact parameters that are returned?
     * */
  getWorkerParams(blockNumber) {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.getWorkerParams(blockNumber).call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        resolve(data);
      });
    });
  }
  /**
   * Get all the Workers parameters
   * @return {Promise} //TODO:: what are the exact parameters that are returned?
   * */
  getWorkersParams() {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.getWorkersParams().call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        resolve(data);
      });
    });
  }
  /**
     * TODO:: what does it do?
     * */
  // getWorkerGroup(blockNumber, secrectContractAddress) {
  //   return new Promise((resolve, reject) => {
  //     this._enigmaContract.methods.getWorkerParams(blockNumber, secrectContractAddress).call((error, data)=> {
  //       if (error) {
  //         reject(error);
  //       }
  //       resolve(data);
  //     });
  //   });
  // }

  /**
   * Get worker information
   * @param {String} address
   * @return {Promise} returning {JSON}: address, status, report, balance
   * */
  getWorker (address) {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.getWorker(address).call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        if (Object.keys(data).length < 4) {
          const err =  new errors.EnigmaContractDataError("Wrong number of parameters received for worker state " + address);
          reject(err);
        }
        const params = {
          address: data.signer,
          status: parseInt(data.status),
          report: data.report,
          balance: parseInt(data.balance)
        };

        resolve(params);
      });
    });
  }
  /**
   * Get self information
   * @return {Promise} returning {JSON}: address, status, report, balance
   * */
  getSelfWorker() {
    return new Promise((resolve, reject) => {
      let address = this.getWorkerAddress();
      if (!address) {
        reject(new errors.InputErr("Missing worker-address when calling getSelfWorker"));
      }
      this._enigmaContract.methods.getWorker(address).call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        if (Object.keys(data).length < 4) {
          const err =  new errors.EnigmaContractDataError("Wrong number of parameters received for worker state " + address);
          reject(err);
        }
        const report = this._web3.utils.hexToAscii(data.report);
        const params = {
          address: data.signer,
          status: parseInt(data.status),
          report: report,
          balance: parseInt(data.balance)
        };
        resolve(params);
      });
    });
  }
  /**
     * * Get the Worker report
     * @param {string} workerAddress
     * @return {Promise} returning {JSON} : {string} signer, {string} report
     * */
  getReport(workerAddress) {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.getReport(workerAddress).call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        if (Object.keys(data).length !== 2) {
          const err =  new errors.EnigmaContractDataError("Wrong number of parameters received for worker report " + workerAddress);
          reject(err);
        }
        const params = {
          signer: data[0],
          report: data[1],
        };
        resolve(params);
      });
    });
  }
  /**
   * * Get task parameters
   * @param {string} taskId
   * @return {Promise} returning {JSON} : {string} inputsHash, {integer} gasLimit, {integer} gasPrice, {string} proof,
   *                                      {string} senderAddress, {string} outputHash
   *  {integer} blockNumber, {ETHEREUM_TASK_STATUS} taskStatus
   * */
  getTaskParams(taskId) {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.getTaskRecord(nodeUtils.add0x(taskId)).call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        const params = {
          inputsHash: data.inputsHash,
          gasLimit: parseInt(data.gasLimit),
          gasPrice: parseInt(data.gasPx),
          proof: data.proof,
          senderAddress: data.sender,
          blockNumber: parseInt(data.blockNumber),
          status: parseInt(data.status),
          outputHash: data.outputHash,
        };
        resolve(params);
      });
    });
  }
  /**
   * * Get Ethereum block number
   * @return {Promise} returning {Integer} : blockNumber
   * */
  getEthereumBlockNumber() {
    return new Promise((resolve, reject) => {
      this._web3.eth.getBlockNumber((error, data)=> {
        if (error) {
          reject(error);
        }
        resolve(data);
      });
    });
  }
  /**
   * * Get Epoch size
   * @return {Promise} returning {Integer} : epochSize
   * */
  getEpochSize() {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.getEpochSize().call(this._defaultTrxOptions, (error, data)=> {
        if (error) {
          reject(error);
        }
        resolve(data);
      });
    });
  }
  /**
   * Listen to events emmited by the Enigma.sol contract and trigger a callback
   * @param {string} eventName
   * @param {Json} filter, in case a filter is required on top of the event itself.
   *               For example, filter all events in which myNumber is 12 or 13: {myNumber: [12,13]}
   * @param {Function} callback (err,event)=>{} //TODO:: add the parameters that the function takes.
   * */
  subscribe(eventName, filter, callback) {
    const eventWatcher = this._enigmaContract.events[eventName]({filter: filter});

    eventWatcher
      .on('data', (event)=>{
        const result = this._eventParsers[eventName](event, this._web3);
        callback(null, result);
      })
      .on('changed', (event)=> {
        this.logger().info('received a change of the event ' + event + '. Deleting its listener');
        if (eventName in this._activeEventSubscriptions) {
          delete(this._activeEventSubscriptions[eventName]);
        }
      })
      .on('error', (err)=>{
        callback(err);
      });

    this._activeEventSubscriptions[eventName] = eventWatcher;
  }
  /**
   * Unsubscribe from all the subscribed events
   * @return {Boolean} success
   * */
  unsubscribeAll() {
    for (const [eventName, eventWatcher] of Object.entries(this._activeEventSubscriptions)) {
      eventWatcher.unsubscribe();
    }
    return true;
  }

  _initEventParsers() {
    this._eventParsers = {
      /**
       * @return {JSON}: {string} workerAddress , {string} signer
       * */
      'Registered': (event) => {
        return {
          workerAddress: event.returnValues.custodian,
          signer: event.returnValues.signer,
        };
      },
      /**
       * @return {JSON}: {string} signature , {string} hash, {string} workerAddress
       * */
      'ValidatedSig': (event) => {
        return {
          signature: event.returnValues.sig,
          hash: event.returnValues.hash,
          workerAddress: event.returnValues.workerAddr,
        };
      },
      /**
       * @return {JSON}: {Integer} seed , {Integer} blockNumber, {Integer} inclusionBlockNumber, {Array<string>} workers,
       *    {Array<Integer>} balances, {Integer} nonce
       * */
      'WorkersParameterized': (event) => {
        return {
          seed: cryptography.toBN(event.returnValues.seed),
          firstBlockNumber: parseInt(event.returnValues.firstBlockNumber),
          inclusionBlockNumber: parseInt(event.returnValues.inclusionBlockNumber),
          workers: event.returnValues.workers,
          balances: event.returnValues.stakes.map((x) => cryptography.toBN(x)),
          nonce: parseInt(event.returnValues.nonce),
        };
      },
      /**
       * @return {JSON}: {string} taskId , {Integer} gasLimit, {Integer} gasPrice, {string} senderAddress
       * */
      'TaskRecordCreated': (event) => {
        return {
          taskId: event.returnValues.taskId,
          inputsHash: event.returnValues.inputsHash,
          gasLimit: parseInt(event.returnValues.gasLimit),
          gasPrice: parseInt(event.returnValues.gasPx),
          senderAddress: event.returnValues.sender,
          blockNumber: parseInt(event.returnValues.blockNumber)
        };
      },
      /**
       * @return {JSON}: {string} senderAddress, {}
       *     {JSON} tasks, indexed by the taskId, each element has: {string} taskId , {Integer} gasLimit, {Integer} gasPrice, {string} inputsHash
       * */
      'TaskRecordsCreated': (event) => {
        let res = {tasks: {}, senderAddress: event.returnValues.sender, blockNumber: parseInt(event.returnValues.blockNumber)};
        for (let i = 0; i < event.returnValues.taskIds.length, i++;) {
          const taskId = event.returnValues.taskIds[i];
          res.tasks[taskId] = {
            taskId: taskId,
            inputsHash: event.returnValues.inputsHashes[i],
            gasLimit: parseInt(event.returnValues.gasLimits[i]),
            gasPrice: parseInt(event.returnValues.gasPrices[i]),
          }
        }
        return res;
      },
      /**
       * @return {JSON}: {string} taskId , {string} stateDeltaHash, {string} outputHash, {integer} stateDeltaHashIndex
       *                 {string} optionalEthereumData, {string} optionalEthereumContractAddress, {string} signature
       * */
      'ReceiptVerified': (event) => {
        return {
          taskId: event.returnValues.taskId,
          stateDeltaHash: event.returnValues.stateDeltaHash,
          stateDeltaHashIndex: parseInt(event.returnValues.deltaHashIndex),
          outputHash: event.returnValues.outputHash,
          optionalEthereumData: event.returnValues.optionalEthereumData,
          optionalEthereumContractAddress: event.returnValues.optionalEthereumContractAddress,
          signature: event.returnValues.sig,
        };
      },
      /**
       * @return {JSON}: {Array<string>} taskIds , {Array<string>} stateDeltaHashes, {Array<string>} outputHashes,
       *                 {string} optionalEthereumData, {string} optionalEthereumContractAddress, {string} signature
       * */
      'ReceiptsVerified': (event) => {
        return {
          taskIds: event.returnValues.taskIds,
          stateDeltaHashes: event.returnValues.stateDeltaHashes,
          outputHashes: event.returnValues.outputHashes,
          optionalEthereumData: event.returnValues.optionalEthereumData,
          optionalEthereumContractAddress: event.returnValues.optionalEthereumContractAddress,
          signature: event.returnValues.sig,
        };
      },
      /**
       * @return {JSON}: {string>} taskId , {string} ethCall, {string} signature
       * */
      'ReceiptFailed': (event) => {
        return {
          taskId: event.returnValues.taskId,
          signature: event.returnValues.sig,
        };
      },
      /**
       * @return {JSON}: {string>} taskId
       * */
      'TaskFeeReturned': (event) => {
        return {
          taskId: event.returnValues.taskId,
        };
      },
      /**
       * @return {JSON}: {string} from , {Integer} value
       * */
      'DepositSuccessful': (event) => {
        return {
          from: event.returnValues.from,
          value: parseInt(event.returnValues.value),
        };
      },
      /**
       * @return {JSON}: {string} to , {Integer} value
       * */
      'WithdrawSuccessful': (event) => {
        return {
          to: event.returnValues.to,
          value: parseInt(event.returnValues.value),
        };
      },
      /**
       * @return {JSON}: {string} secretContractAddress , {string} codeHash, {string} initDeltaHash
       * */
      'SecretContractDeployed': (event) => {
        return {
          secretContractAddress: event.returnValues.scAddr,
          codeHash: event.returnValues.codeHash,
          initDeltaHash: event.returnValues.initDeltaHash,
        };
      },
    };
  }
}


module.exports = EnigmaContractReaderAPI;
