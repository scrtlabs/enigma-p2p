const utils = require("../common/utils");
const errors = require("../common/errors");
const constants = require("../common/constants");
const EnigmaContractWriterAPI = require("./EnigmaContractWriterAPI");

const EMPTY_HEX_STRING = "0x"; // This is the right value to pass an empty value to the contract, otherwise we get an error

const ETHEREUM_CONFIRMATION_EVENT = "confirmation";
const ETHEREUM_RECEIPT_EVENT = "receipt";
const ETHEREUM_ERROR_EVENT = "error";

class EnigmaContractProductionWriterAPI extends EnigmaContractWriterAPI {
  constructor(
    enigmaContractAddress,
    enigmaContractABI,
    web3,
    logger,
    workerAddress,
    privateKey,
    stakingAddress,
    minimumConfirmations = constants.MINIMUM_CONFIRMATIONS
  ) {
    super(enigmaContractAddress, enigmaContractABI, web3, logger, workerAddress);
    this._privateKey = privateKey;
    this._stakingAddres = stakingAddress;
    this.minimumConfirmations = minimumConfirmations;
  }
  /**
   * Step 1 in registration
   * Register a worker to the network.
   * @param {string} signerAddress ,
   * @param {string} report , worker
   * @param {string} signature
   * @param {JSON} txParams
   * @return {Promise} in success: null, in failure: error
   * */
  register(signerAddress, report, signature, txParams = null) {
    return new Promise(async (resolve, reject) => {
      const res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      const tx = {
        from: res.transactionOptions.from,
        to: this._enigmaContractAddress,
        gas: res.transactionOptions.gas,
        // this encodes the ABI of the method and th
        data: this._enigmaContract.methods
          .register(
            utils.add0x(this._stakingAddres),
            utils.add0x(signerAddress),
            utils.add0x(report),
            utils.add0x(signature)
          )
          .encodeABI()
      };

      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const signedTransaction = this._web3.eth
        .sendSignedTransaction(signedTx.rawTransaction)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, async receipt => {
          if (this.minimumConfirmations === 0 || !Number.isInteger(this.minimumConfirmations)) {
            resolve(null);
          }
        })
        .on(ETHEREUM_CONFIRMATION_EVENT, async (confNumber, receipt) => {
          if (confNumber >= this.minimumConfirmations) {
            signedTransaction.off(ETHEREUM_CONFIRMATION_EVENT);
            resolve(null);
          }
        });
    });
  }
  /**
   * deploy a secret contract by a worker
   * @param {string} taskId
   * @param {string} preCodeHash
   * @param {string} codeHash
   * @param {string} initStateDeltaHash
   * @param {string} optionalEthereumData
   * @param {string} optionalEthereumContractAddress
   * @param {Integer} gasUsed
   * @param {string} signature //TODO:: since it expects bytes maybe here it will be bytes as well (Json-san)
   * @param {JSON} txParams
   * @return @return {Promise} in success: Enigma contract emitted events, in failure: error //TODO:: we want to turn all the Json's into real classes.
   * */
  deploySecretContract(
    taskId,
    preCodeHash,
    codeHash,
    initStateDeltaHash,
    optionalEthereumData,
    optionalEthereumContractAddress,
    gasUsed,
    signature,
    txParams = null
  ) {
    return new Promise(async (resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      if (!optionalEthereumData) {
        optionalEthereumData = EMPTY_HEX_STRING;
      }
      const packedParams = [
        utils.add0x(taskId),
        utils.add0x(preCodeHash),
        utils.add0x(codeHash),
        utils.add0x(initStateDeltaHash)
      ];
      const tx = {
        from: res.transactionOptions.from,
        to: this._enigmaContractAddress,
        gas: res.transactionOptions.gas,
        data: this._enigmaContract.methods
          .deploySecretContract(
            gasUsed,
            utils.add0x(optionalEthereumContractAddress),
            packedParams,
            utils.add0x(optionalEthereumData),
            utils.add0x(signature)
          )
          .encodeABI()
      };
      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const blockNumber = await utils.getEthereumBlockNumber(this.w3());

      const resolveLogic = async () => {
        let deployedEvents = await this._parsePastEvents(
          constants.RAW_ETHEREUM_EVENTS.SecretContractDeployed,
          { taskId: utils.add0x(taskId) },
          blockNumber
        );
        if (deployedEvents && Object.keys(deployedEvents).length > 0) {
          resolve(deployedEvents);
        } else {
          let failedEvents = await this._parsePastEvents(
            constants.RAW_ETHEREUM_EVENTS.ReceiptFailedETH,
            { taskId: utils.add0x(taskId) },
            blockNumber
          );
          resolve(failedEvents);
        }
      };

      const signedTransaction = this._web3.eth
        .sendSignedTransaction(signedTx.rawTransaction)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, async receipt => {
          if (this.minimumConfirmations === 0 || !Number.isInteger(this.minimumConfirmations)) {
            await resolveLogic();
          }
        })
        .on(ETHEREUM_CONFIRMATION_EVENT, async (confNumber, receipt) => {
          if (confNumber >= this.minimumConfirmations) {
            signedTransaction.off(ETHEREUM_CONFIRMATION_EVENT);
            await resolveLogic();
          }
        });
    });
  }
  /**
   * login a worker
   * @return {Promise} in success: null, in failure: error
   * */
  login(txParams = null) {
    return new Promise(async (resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      const tx = {
        from: res.transactionOptions.from,
        to: this._enigmaContractAddress,
        gas: res.transactionOptions.gas,
        data: this._enigmaContract.methods.login().encodeABI()
      };

      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const signedTransaction = this._web3.eth
        .sendSignedTransaction(signedTx.rawTransaction)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, async receipt => {
          if (this.minimumConfirmations === 0 || !Number.isInteger(this.minimumConfirmations)) {
            resolve(null);
          }
        })
        .on(ETHEREUM_CONFIRMATION_EVENT, (confNumber, receipt) => {
          if (confNumber >= this.minimumConfirmations) {
            signedTransaction.off(ETHEREUM_CONFIRMATION_EVENT);
            resolve(null);
          }
        });
    });
  }
  /**
   * login a worker
   * @return {Promise} in success: null, in failure: error
   * */
  logout(txParams = null) {
    return new Promise(async (resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      const tx = {
        from: res.transactionOptions.from,
        to: this._enigmaContractAddress,
        gas: res.transactionOptions.gas,
        data: this._enigmaContract.methods.logout().encodeABI()
      };

      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const signedTransaction = this._web3.eth
        .sendSignedTransaction(signedTx.rawTransaction)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, async receipt => {
          if (this.minimumConfirmations === 0 || !Number.isInteger(this.minimumConfirmations)) {
            resolve(null);
          }
        })
        .on(ETHEREUM_CONFIRMATION_EVENT, (confNumber, receipt) => {
          if (confNumber >= this.minimumConfirmations) {
            signedTransaction.off(ETHEREUM_CONFIRMATION_EVENT);
            resolve(null);
          }
        });
    });
  }

  /**
   * Worker commits the results on-chain
   * @param {string} secretContractAddress
   * @param {string} taskId
   * @param {string} stateDeltaHash
   * @param {string} outputHash
   * @param {string} optionalEthereumData
   * @param {string} optionalEthereumContractAddress
   * @param {Integer} gasUsed
   * @param {string} signature
   * @param {JSON} txParams
   * @return {Promise} in success: Enigma contract emitted events, in failure: error
   * */
  commitReceipt(
    secretContractAddress,
    taskId,
    stateDeltaHash,
    outputHash,
    optionalEthereumData,
    optionalEthereumContractAddress,
    gasUsed,
    signature,
    txParams = null
  ) {
    return new Promise(async (resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      if (!optionalEthereumData) {
        optionalEthereumData = EMPTY_HEX_STRING;
      }
      if (!stateDeltaHash) {
        stateDeltaHash = EMPTY_HEX_STRING;
      }
      const packedParams = [
        utils.add0x(secretContractAddress),
        utils.add0x(taskId),
        utils.add0x(stateDeltaHash),
        utils.add0x(outputHash)
      ];
      const tx = {
        from: res.transactionOptions.from,
        to: this._enigmaContractAddress,
        gas: res.transactionOptions.gas,
        data: this._enigmaContract.methods
          .commitReceipt(
            gasUsed,
            utils.add0x(optionalEthereumContractAddress),
            packedParams,
            utils.add0x(optionalEthereumData),
            utils.add0x(signature)
          )
          .encodeABI()
      };

      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const blockNumber = await utils.getEthereumBlockNumber(this.w3());

      const resolveLogic = async () => {
        let possibleEvents;
        try {
          possibleEvents = await this._enigmaContract.getPastEvents("allEvents", { fromBlock: blockNumber });
        } catch (e) {
          reject(e);
          return;
        }

        if (!Array.isArray(possibleEvents) || possibleEvents.length == 0) {
          reject(
            new errors.CommitReceiptEthereumError(
              `The commitReceipt function for taskId ${taskId} in the Enigma contract didn't emit any result event.`
            )
          );
          return;
        }

        const matchingEvents = possibleEvents
          .map(e => this._parseEvents({ [e.event]: e }))
          .filter(e => Object.keys(e).length == 1 && e[Object.keys(e)[0]].taskId == taskId);

        if (matchingEvents.length == 0) {
          reject(
            new errors.CommitReceiptEthereumError(
              `The commitReceipt function in the Enigma contract didn't emit a result event for taskId ${taskId}.`
            )
          );
          return;
        }

        if (matchingEvents.length > 1) {
          reject(
            new errors.CommitReceiptEthereumError(
              `The commitReceipt function in the Enigma contract emitted too many (${
                matchingEvents.length
              }: ${JSON.stringify(matchingEvents)}) result events for taskId ${taskId}.`
            )
          );
          return;
        }

        resolve(matchingEvents[0]);
      };

      const signedTransaction = this._web3.eth
        .sendSignedTransaction(signedTx.rawTransaction)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, async receipt => {
          if (this.minimumConfirmations === 0 || !Number.isInteger(this.minimumConfirmations)) {
            await resolveLogic();
          }
        })
        .on(ETHEREUM_CONFIRMATION_EVENT, async (confNumber, receipt) => {
          if (confNumber >= this.minimumConfirmations) {
            signedTransaction.off(ETHEREUM_CONFIRMATION_EVENT);
            await resolveLogic();
          }
        });
    });
  }
  /**
   * Worker commits the failed task result on-chain
   * @param {string} secretContractAddress
   * @param {string} taskId
   * @param {string} outputHash
   * @param {Integer} gasUsed
   * @param {string} signature
   * @param {JSON} txParams
   * @return {Promise} in success: Enigma contract emitted events, in failure: error
   * */
  commitTaskFailure(secretContractAddress, taskId, outputHash, gasUsed, signature, txParams = null) {
    return new Promise(async (resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      const tx = {
        from: res.transactionOptions.from,
        to: this._enigmaContractAddress,
        gas: res.transactionOptions.gas,
        data: this._enigmaContract.methods
          .commitTaskFailure(
            utils.add0x(secretContractAddress),
            utils.add0x(taskId),
            utils.add0x(outputHash),
            gasUsed,
            utils.add0x(signature)
          )
          .encodeABI()
      };
      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const blockNumber = await utils.getEthereumBlockNumber(this.w3());

      const resolveLogic = async () => {
        let events = await this._parsePastEvents(
          constants.RAW_ETHEREUM_EVENTS.ReceiptFailed,
          { taskId: utils.add0x(taskId) },
          blockNumber
        );
        resolve(events);
      };

      const signedTransaction = this._web3.eth
        .sendSignedTransaction(signedTx.rawTransaction)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, async receipt => {
          if (this.minimumConfirmations === 0 || !Number.isInteger(this.minimumConfirmations)) {
            await resolveLogic();
          }
        })
        .on(ETHEREUM_CONFIRMATION_EVENT, async (confNumber, receipt) => {
          if (confNumber >= this.minimumConfirmations) {
            signedTransaction.off(ETHEREUM_CONFIRMATION_EVENT);
            await resolveLogic();
          }
        });
    });
  }
  /**
   * Worker commits the failed deploy task result on-chain
   * @param {string} taskId == secretContractAddress
   * @param {string} outputHash
   * @param {Integer} gasUsed
   * @param {string} signature
   * @param {JSON} txParams
   * @return {Promise} in success: Enigma contract emitted events, in failure: error
   * */
  deploySecretContractFailure(taskId, outputHash, gasUsed, signature, txParams = null) {
    return new Promise(async (resolve, reject) => {
      const res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }

      const tx = {
        from: res.transactionOptions.from,
        to: this._enigmaContractAddress,
        gas: res.transactionOptions.gas,
        data: this._enigmaContract.methods
          .deploySecretContractFailure(utils.add0x(taskId), utils.add0x(outputHash), gasUsed, utils.add0x(signature))
          .encodeABI()
      };
      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const blockNumber = await utils.getEthereumBlockNumber(this.w3());

      const resolveLogic = async () => {
        let events = await this._parsePastEvents(
          constants.RAW_ETHEREUM_EVENTS.ReceiptFailed,
          { taskId: utils.add0x(taskId) },
          blockNumber
        );
        resolve(events);
      };

      const signedTransaction = this._web3.eth
        .sendSignedTransaction(signedTx.rawTransaction)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, async receipt => {
          if (this.minimumConfirmations === 0 || !Number.isInteger(this.minimumConfirmations)) {
            await resolveLogic();
          }
        })
        .on(ETHEREUM_CONFIRMATION_EVENT, async (confNumber, receipt) => {
          if (confNumber >= this.minimumConfirmations) {
            signedTransaction.off(ETHEREUM_CONFIRMATION_EVENT);
            await resolveLogic();
          }
        });
    });
  }

  async _parsePastEvents(eventName, filter, blockNumber) {
    const rawEvents = await this._enigmaContract.getPastEvents(eventName, { fromBlock: blockNumber, filter: filter });

    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
      return {};
    }

    if (rawEvents.length > 1) {
      this._logger.info(
        `Received an unexpected number of events for ${eventName} with the filter ${JSON.stringify({
          fromBlock: blockNumber,
          filter: filter
        })}. Taking the first one.`
      );
    }

    return this._parseEvents({ [eventName]: rawEvents[0] });
  }
}

module.exports = EnigmaContractProductionWriterAPI;
