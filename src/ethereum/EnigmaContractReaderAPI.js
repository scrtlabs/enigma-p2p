const errors = require("../common/errors");
const constants = require("../common/constants");
const Logger = require("../common/logger");
const nodeUtils = require("../common/utils");
const cryptography = require("../common/cryptography");

// TODO:: delegate the configuration load to the caller from the outside + allow dynamic path (because the caller is responsible).
const config = require("./config.json");

/*
Using "Ox" in hexadecimal strings: (not sure this belongs here but don't have a better place at the moment)
Ethereum by default uses "0x" when representing hexadecimal strings, while Javascript dismisses the "0x".
So in Enigma-P2P most hexadecimal strings are represented without "0x":
TaskId and secretContractAddresses are thus treated everywhere without "0x" but hashes are represented the way Ethereum does,
because we use web3 for the hash calculation. This inconsistency is misleading and should be addressed properly. TODO(lenak)
 */

class EnigmaContractReaderAPI {
  /**
   * {string} enigmaContractAddress
   * {Json} enigmaContractABI
   * {Web3} web3
   * */
  constructor(
    enigmaContractAddress,
    enigmaContractABI,
    web3,
    logger,
    workerAddress,
    minimumConfirmations = constants.MINIMUM_CONFIRMATIONS
  ) {
    this._enigmaContract = new web3.eth.Contract(enigmaContractABI, enigmaContractAddress);
    this._web3 = web3;
    this._chainId = null;
    this._enigmaContractAddress = enigmaContractAddress;
    this._activeEventSubscriptions = {};
    this._initEventParsers();
    this.minimumConfirmations = minimumConfirmations;

    if (logger) {
      this._logger = logger;
    } else {
      this._logger = new Logger({ name: "EnigmaContractReaderAPI" });
    }

    const conf = JSON.parse(JSON.stringify(config)); // deep copy

    this._defaultTrxOptions = conf.default;
    this._validTrxParams = conf.valid;

    if (workerAddress) {
      this._workerAddress = workerAddress;
      this._defaultTrxOptions.from = workerAddress;
    } else {
      this._workerAddress = null;
    }
  }
  w3() {
    return this._web3;
  }
  async getChainId() {
    if (!this._chainId) {
      this._chainId = await this._web3.eth.net.getId();
    }
    return this._chainId;
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
  async getContractParams(secrectContractAddress) {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .getSecretContract(nodeUtils.add0x(secrectContractAddress))
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
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
  async countSecretContracts() {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .countSecretContracts()
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
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
  async getSecretContractAddresses(from, to) {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .getSecretContractAddresses(from, to)
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
          }
          if (data) {
            let newScAddressesArray = [];
            data.forEach(scAddress => {
              newScAddressesArray.push(nodeUtils.remove0x(scAddress));
            });
            resolve(newScAddressesArray);
          } else {
            resolve(data);
          }
        });
    });
  }
  /**
   * return the list of all secret contract addresses
   * @return {Promise} Array<string>
   * */
  async getAllSecretContractAddresses() {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .getAllSecretContractAddresses()
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
          }

          if (data) {
            let newScAddressesArray = [];
            data.forEach(scAddress => {
              newScAddressesArray.push(nodeUtils.remove0x(scAddress));
            });
            resolve(newScAddressesArray);
          } else {
            // Assaf: why the if/else?
            resolve(data);
          }
        });
    });
  }
  /**
   * Get the Worker parameters
   * @param {Integer} blockNumber //TODO:: check which time solidity expects, maybe BN ?
   * @return {Promise} //TODO:: what are the exact parameters that are returned?
   * */
  async getWorkerParams(blockNumber) {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .getWorkerParams(blockNumber)
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(data);
        });
    });
  }
  /**
   * Get all the Workers parameters
   * @return {Promise} //TODO:: what are the exact parameters that are returned?
   * */
  async getWorkersParams() {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .getWorkersParams()
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(data);
        });
    });
  }
  /**
   * TODO:: what does it do?
   * */
  // getWorkerGroup(blockNumber, secrectContractAddress) {
  //   return new Promise(async (resolve, reject) => {
  // const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
  // const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
  //     this._enigmaContract.methods.getWorkerParams(blockNumber, secrectContractAddress).call(this._defaultTrxOptions, confirmedBlockNumber,(error, data)=> {
  //       if (error) {
  //         reject(error);
  //         return
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
  async getWorker(address) {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .getWorker(address)
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
          }

          if (Object.keys(data).length < 4) {
            const err = new errors.EnigmaContractDataError(
              "Wrong number of parameters received for worker state " + address
            );
            reject(err);
            return;
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
  async getSelfWorker() {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const address = this.getWorkerAddress();
      if (!address) {
        reject(new errors.InputErr("Missing worker-address when calling getSelfWorker"));
        return;
      }
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .getWorker(address)
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
          }

          if (Object.keys(data).length < 4) {
            const err = new errors.EnigmaContractDataError(
              "Wrong number of parameters received for worker state " + address
            );
            reject(err);
            return;
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
  async getReport(workerAddress) {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .getReport(workerAddress)
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
          }
          if (Object.keys(data).length !== 2) {
            const err = new errors.EnigmaContractDataError(
              "Wrong number of parameters received for worker report " + workerAddress
            );
            reject(err);
            return;
          }
          const params = {
            signer: data[0],
            report: data[1]
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
  async getTaskParams(taskId) {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods
        .getTaskRecord(nodeUtils.add0x(taskId))
        .call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
          if (error) {
            reject(error);
            return;
          }
          const params = {
            inputsHash: data.inputsHash,
            gasLimit: parseInt(data.gasLimit),
            gasPrice: parseInt(data.gasPx),
            proof: data.proof,
            senderAddress: data.sender,
            blockNumber: parseInt(data.blockNumber),
            status: parseInt(data.status),
            outputHash: data.outputHash
          };
          resolve(params);
        });
    });
  }

  /**
   * * Get Epoch size
   * @return {Promise} returning {Integer} : epochSize
   * */
  async getEpochSize() {
    const currentBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
    return new Promise(async (resolve, reject) => {
      const confirmedBlockNumber = currentBlockNumber - this.minimumConfirmations;
      this._enigmaContract.methods.getEpochSize().call(this._defaultTrxOptions, confirmedBlockNumber, (error, data) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(data);
      });
    });
  }
  /**
   * * Get Task Timeout
   * @return {Promise} returning {Integer} : epochSize
   * */
  getTaskTimeout() {
    return new Promise((resolve, reject) => {
      this._enigmaContract.methods.getTaskTimeoutSize().call(this._defaultTrxOptions, (error, data) => {
        if (error) {
          reject(error);
        }
        resolve(data);
      });
    });
  }
  /**
   * Listen to events emitted by the Enigma.sol contract and trigger a callback
   * @param {string} eventName
   * @param {Json} filter, in case a filter is required on top of the event itself.
   *               For example, filter all events in which myNumber is 12 or 13: {myNumber: [12,13]}
   * @param {Function} callback (err,event)=>{} //TODO:: add the parameters that the function takes.
   * */
  subscribe(eventName, filter, callback) {
    const eventWatcher = this._enigmaContract.events[eventName]({
      filter: filter
    });

    eventWatcher.on("data", async event => {
      const result = this._eventParsers[eventName](event, this._web3);
      const startingBlockNumber = await nodeUtils.getEthereumBlockNumber(this.w3());
      const confirmedBlockNumber = startingBlockNumber + this.minimumConfirmations;
      const subscription = this._web3.eth
        .subscribe("newBlockHeaders", async (error, event) => {
          if (error) {
            callback(err);
            subscription.unsubscribe(/*TODO handle?*/);
          } else if (confirmedBlockNumber <= event.number) {
            callback(null, result);
            subscription.unsubscribe(/*TODO handle?*/);
          }
        })
        .on("changed", event => {
          this.logger().info("received a change of the event " + event + ". Deleting its listener");
          if (eventName in this._activeEventSubscriptions) {
            delete this._activeEventSubscriptions[eventName];
          }
        })
        .on("error", err => {
          callback(err);
        });

      this._activeEventSubscriptions[eventName] = eventWatcher;
    });
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
      [constants.RAW_ETHEREUM_EVENTS.Registered]: event => {
        return {
          workerAddress: event.returnValues.custodian,
          signer: event.returnValues.signer
        };
      },
      /**
       * @return {JSON}: {Integer} seed , {Integer} blockNumber, {Integer} inclusionBlockNumber, {Array<string>} workers,
       *    {Array<Integer>} balances, {Integer} nonce
       * */
      [constants.RAW_ETHEREUM_EVENTS.WorkersParameterized]: event => {
        return {
          seed: cryptography.toBN(event.returnValues.seed),
          firstBlockNumber: parseInt(event.returnValues.firstBlockNumber),
          inclusionBlockNumber: parseInt(event.returnValues.inclusionBlockNumber),
          workers: event.returnValues.workers,
          balances: event.returnValues.stakes.map(x => cryptography.toBN(x)),
          nonce: parseInt(event.returnValues.nonce)
        };
      },
      /**
       * @return {JSON}: {string} taskId , {Integer} gasLimit, {Integer} gasPrice, {string} senderAddress
       * */
      [constants.RAW_ETHEREUM_EVENTS.TaskRecordCreated]: event => {
        return {
          taskId: nodeUtils.remove0x(event.returnValues.taskId),
          inputsHash: event.returnValues.inputsHash,
          gasLimit: parseInt(event.returnValues.gasLimit),
          gasPrice: parseInt(event.returnValues.gasPx),
          senderAddress: event.returnValues.sender,
          blockNumber: parseInt(event.returnValues.blockNumber)
        };
      },
      /**
       * @return {JSON}: {string} taskId , {string} stateDeltaHash, {string} outputHash, {integer} stateDeltaHashIndex
       *                 {string} optionalEthereumData, {string} optionalEthereumContractAddress, {string} signature
       * */
      [constants.RAW_ETHEREUM_EVENTS.ReceiptVerified]: event => {
        return {
          taskId: nodeUtils.remove0x(event.returnValues.taskId),
          stateDeltaHash: event.returnValues.bytes32s[2],
          stateDeltaHashIndex: parseInt(event.returnValues.deltaHashIndex),
          outputHash: event.returnValues.bytes32s[3]
        };
      },
      /**
       * @return {JSON}: {string>} taskId , {string} ethCall, {string} signature
       * */
      [constants.RAW_ETHEREUM_EVENTS.ReceiptFailed]: event => {
        return {
          taskId: nodeUtils.remove0x(event.returnValues.taskId),
          signature: event.returnValues.sig
        };
      },
      /**
       * @return {JSON}: {string>} taskId , {string} ethCall, {string} signature
       * */
      [constants.RAW_ETHEREUM_EVENTS.ReceiptFailedETH]: event => {
        return {
          taskId: nodeUtils.remove0x(event.returnValues.taskId),
          signature: event.returnValues.sig
        };
      },
      /**
       * @return {JSON}: {string>} taskId
       * */
      [constants.RAW_ETHEREUM_EVENTS.TaskFeeReturned]: event => {
        return {
          taskId: event.returnValues.taskId
        };
      },
      /**
       * @return {JSON}: {string} from , {Integer} value
       * */
      [constants.RAW_ETHEREUM_EVENTS.DepositSuccessful]: event => {
        return {
          from: event.returnValues.from,
          value: parseInt(event.returnValues.value)
        };
      },
      /**
       * @return {JSON}: {string} to , {Integer} value
       * */
      [constants.RAW_ETHEREUM_EVENTS.WithdrawSuccessful]: event => {
        return {
          to: event.returnValues.to,
          value: parseInt(event.returnValues.value)
        };
      },
      /**
       * @return {JSON}: {string} secretContractAddress , {string} codeHash, {string} stateDeltaHash
       * */
      [constants.RAW_ETHEREUM_EVENTS.SecretContractDeployed]: event => {
        return {
          secretContractAddress: nodeUtils.remove0x(event.returnValues.bytes32s[0]),
          codeHash: event.returnValues.bytes32s[2],
          stateDeltaHash: event.returnValues.bytes32s[3]
        };
      },
      /**
       * @return {JSON}: {string} workerAddress
       * */
      [constants.RAW_ETHEREUM_EVENTS.LoggedIn]: event => {
        return {
          workerAddress: event.returnValues.workerAddress
        };
      },
      /**
       * @return {JSON}: {string} workerAddress
       * */
      [constants.RAW_ETHEREUM_EVENTS.LoggedOut]: event => {
        return {
          workerAddress: event.returnValues.workerAddress
        };
      }
    };
  }
}

module.exports = EnigmaContractReaderAPI;
