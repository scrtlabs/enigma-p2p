const defaultsDeep = require("@nodeutils/defaults-deep");
const utils = require("../common/utils");
const constants = require("../common/constants");
const EnigmaContractReaderAPI = require("./EnigmaContractReaderAPI");

const EMPTY_HEX_STRING = "0x"; // This is the right value to pass an empty value to the contract, otherwise we get an error

const ETHEREUM_CONFIRMATION_EVENT = "confirmation";
const ETHEREUM_RECEIPT_EVENT = "receipt";
const ETHEREUM_ERROR_EVENT = "error";

class EnigmaContractWriterAPI extends EnigmaContractReaderAPI {
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
    this._privateKey = utils.add0x(privateKey);
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
          .encodeABI(),
        chainId: await this.getChainId()
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
          .encodeABI(),
        chainId: await this.getChainId()
      };
      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const blockNumber = await utils.getEthereumBlockNumber(this.w3());

      const resolveLogic = async () => {
        const events = await this._parsePastEvents("allEvents", { taskId: utils.add0x(taskId) }, blockNumber);
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
        data: this._enigmaContract.methods.login().encodeABI(),
        chainId: await this.getChainId()
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
        data: this._enigmaContract.methods.logout().encodeABI(),
        chainId: await this.getChainId()
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
          .encodeABI(),
        chainId: await this.getChainId()
      };

      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const blockNumber = await utils.getEthereumBlockNumber(this.w3());

      const resolveLogic = async () => {
        const events = await this._parsePastEvents("allEvents", { taskId: utils.add0x(taskId) }, blockNumber);
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
          .encodeABI(),
        chainId: await this.getChainId()
      };
      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const blockNumber = await utils.getEthereumBlockNumber(this.w3());

      const resolveLogic = async () => {
        const events = await this._parsePastEvents(
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
          .encodeABI(),
        chainId: await this.getChainId()
      };
      const signedTx = await this._web3.eth.accounts.signTransaction(tx, this._privateKey);
      const blockNumber = await utils.getEthereumBlockNumber(this.w3());

      const resolveLogic = async () => {
        const events = await this._parsePastEvents(
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

    return this._parseEvents({ [rawEvents[0].event]: rawEvents[0] });
  }
  getTransactionOptions(txParams) {
    let transactionOptions = this._defaultTrxOptions;
    if (txParams !== undefined && txParams !== null) {
      const error = this._validateTxParams(txParams);
      if (error !== null) {
        return { error: error };
      }
      transactionOptions = defaultsDeep(txParams, this._defaultTrxOptions);
    }
    return { transactionOptions: transactionOptions, error: null };
  }
  _parseEvents(events) {
    let parsedEvents = {};
    for (let eventName of Object.keys(events)) {
      if (eventName in constants.RAW_ETHEREUM_EVENTS) {
        parsedEvents[eventName] = this._eventParsers[eventName](events[eventName]);
      }
    }
    return parsedEvents;
  }
  _validateTxParams(txParams) {
    if ("gas" in txParams) {
      if (txParams.gas < this._validTrxParams.gasMin || txParams.gas > this._validTrxParams.gasMax) {
        return (
          "gas limit specified " +
          txParams.gas +
          " is not in the allowed range: " +
          this._validTrxParams.gasMin +
          "-" +
          this._validTrxParams.gasMax
        );
      }
    }
    if ("gasPrice" in txParams) {
      if (
        txParams.gasPrice < this._validTrxParams.gasPriceMin ||
        txParams.gasPrice > this._validTrxParams.gasPriceMax
      ) {
        return (
          "gas price specified " +
          txParams.gasPrice +
          " is not in the allowed range: " +
          this._validTrxParams.gasPriceMin +
          "-" +
          this._validTrxParams.gasPriceMax
        );
      }
    }
    if ("from" in txParams) {
      if (!this._web3.utils.isAddress(txParams.from)) {
        return (
          "the from address specified " +
          txParams.from +
          " is not a valid Ethereum address" +
          this._validTrxParams.gasPriceMin +
          "-" +
          this._validTrxParams.gasPriceMax
        );
      }
    }
    return null;
  }
}

module.exports = EnigmaContractWriterAPI;
