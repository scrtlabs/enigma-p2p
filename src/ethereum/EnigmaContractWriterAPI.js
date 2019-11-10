const defaultsDeep = require('@nodeutils/defaults-deep');
const utils = require('../common/utils');
const errors = require('../common/errors');

const EnigmaContractReaderAPI = require('./EnigmaContractReaderAPI');

const EMPTY_HEX_STRING = '0x'; // This is the right value to pass an empty value to the contract, otherwise we get an error

const ETHEREUM_CONFIRMATION_EVENT = 'confirmation';
const ETHEREUM_RECEIPT_EVENT = 'receipt';
const ETHEREUM_ERROR_EVENT = 'error';

class EnigmaContractWriterAPI extends EnigmaContractReaderAPI {
  constructor(enigmaContractAddress, enigmaContractABI, web3, logger, workerAddress) {
    super(enigmaContractAddress, enigmaContractABI, web3, logger, workerAddress, 0);
  }
  /**
     * Step 1 in registration
     * Register a worker to the network.
     * @param {string} signerAddress ,
     * @param {string} report , worker
     * @param {string} signature
     * @param {JSON} txParams
     * @return {Promise} in success: Enigma contract emitted events, in failure: error
     * */
  register(signerAddress, report, signature, txParams = null) {
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      this._enigmaContract.methods.register(
        utils.add0x(signerAddress),
        utils.add0x(report),
        utils.add0x(signature))
        .send(res.transactionOptions)
        // .on('confirmation', (confirmationNumber, receipt) => {
        //   console.log("at register confirmation. number=", confirmationNumber);
        //   console.log("at register confirmation. receipt=", JSON.stringify(receipt));
        //   resolve(receipt);
        // })
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        })
    });
  }
  /**
     * Step 2 in registration : stake ENG's (TO DA MOON)
     * @param {string} custodian - the worker address
     * @param {Integer} amount
     * @param {JSON} txParams
     * @return {Promise} in success: Enigma contract emitted events, in failure: error
     * */
  deposit(custodian, amount, txParams = null) {
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      this._enigmaContract.methods.deposit(custodian, amount).send(res.transactionOptions)
        // .on(ETHEREUM_CONFIRMATION_EVENT, (confirmationNumber, receipt) => {
        //   console.log("at deposit confirmation. number=", confirmationNumber);
        //   resolve(receipt);
        // })
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        })
    });
  }
  /**
   * Step 2 in registration : stake ENG's of the current worker(TO DA MOON)
   * @param {Integer} amount
   * @param {JSON} txParams
   * @return {Promise} in success: Enigma contract emitted events, in failure: error
   * */
  selfDeposit(amount, txParams = null) {
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      let workerAddress = this.getWorkerAddress();
      if (!workerAddress) {
        reject(new errors.InputErr("Missing worker-address when calling selfDeposit"));
      }
      this._enigmaContract.methods.deposit(workerAddress, amount).send(res.transactionOptions)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        })
    });
  }
  /**
   * Withdraw worker's stake (full or partial)
   * @param {Integer} amount
   * @param {JSON} txParams
   * @return {Promise} in success: Enigma contract emitted events, in failure: error
   * */
  withdraw(amount, txParams) {
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      this._enigmaContract.methods.withdraw(amount).send(res.transactionOptions)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        })
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
  deploySecretContract(taskId, preCodeHash, codeHash, initStateDeltaHash, optionalEthereumData, optionalEthereumContractAddress, gasUsed, signature, txParams = null) {
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      if (!optionalEthereumData) {
        optionalEthereumData = EMPTY_HEX_STRING;
      }
      const packedParams = [utils.add0x(taskId), utils.add0x(preCodeHash), utils.add0x(codeHash), utils.add0x(initStateDeltaHash)];
      this._enigmaContract.methods.deploySecretContract(
        gasUsed,
        utils.add0x(optionalEthereumContractAddress),
        packedParams,
        utils.add0x(optionalEthereumData),
        utils.add0x(signature))
        .send(res.transactionOptions)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        })
    });
  }
  /**
     * login a worker
     * @return {Promise} in success: Enigma contract emitted events, in failure: error
     * */
  login(txParams = null) {
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      this._enigmaContract.methods.login().send(res.transactionOptions)
        // .on('confirmation', (confirmationNumber, receipt) => {
        //   console.log("at login confirmation. number=", confirmationNumber);
        //   resolve(receipt);
        // })
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        });
    });
  }
  /**
     * login a worker
     * @return {Promise} in success: Enigma contract emitted events, in failure: error
     * */
  logout(txParams = null) {
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      this._enigmaContract.methods.logout().send(res.transactionOptions)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        })
    });
  }
  /**
     * Irrelevant for workers -> users create deployment tasks with it
     * */
  createDeploymentTaskRecord(inputsHash, gasLimit, gasPrice, firstBlockNumber, nonce, txParams = null) {
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      this._enigmaContract.methods.createDeploymentTaskRecord(inputsHash, gasLimit, gasPrice, firstBlockNumber, nonce)
        .send(res.transactionOptions, (error, receipt) => {
          if (error) {
            reject(error);
          }
          resolve(receipt);
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
  commitReceipt(secretContractAddress, taskId, stateDeltaHash, outputHash, optionalEthereumData, optionalEthereumContractAddress, gasUsed, signature, txParams = null) {
    return new Promise((resolve, reject) => {
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
      const packedParams = [utils.add0x(secretContractAddress), utils.add0x(taskId), utils.add0x(stateDeltaHash), utils.add0x(outputHash)];
      this._enigmaContract.methods.commitReceipt(
        gasUsed,
        utils.add0x(optionalEthereumContractAddress),
        packedParams,
        utils.add0x(optionalEthereumData),
        utils.add0x(signature)).send(res.transactionOptions)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        })
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
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      this._enigmaContract.methods.commitTaskFailure(
        utils.add0x(secretContractAddress),
        utils.add0x(taskId),
        utils.add0x(outputHash),
        gasUsed,
        utils.add0x(signature))
        .send(res.transactionOptions)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        })
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
    return new Promise((resolve, reject) => {
      let res = this.getTransactionOptions(txParams);
      if (res.error) {
        reject(res.error);
        return;
      }
      this._enigmaContract.methods.deploySecretContractFailure(
        utils.add0x(taskId),
        utils.add0x(outputHash),
        gasUsed,
        utils.add0x(signature))
        .send(res.transactionOptions)
        .on(ETHEREUM_ERROR_EVENT, (error, receipt) => {
          reject(error);
        })
        .on(ETHEREUM_RECEIPT_EVENT, (receipt) => {
          let events = receipt.events ? this._parseEvents(receipt.events) : null;
          resolve(events);
        })
    });
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
      parsedEvents[eventName] = this._eventParsers[eventName](events[eventName]);
    }
    return parsedEvents;
  }
  _validateTxParams(txParams) {
    if ('gas' in txParams) {
      if (txParams.gas < this._validTrxParams.gasMin || txParams.gas > this._validTrxParams.gasMax) {
        return 'gas limit specified ' + txParams.gas + ' is not in the allowed range: ' + this._validTrxParams.gasMin + '-' + this._validTrxParams.gasMax;
      }
    }
    if ('gasPrice' in txParams) {
      if (txParams.gasPrice < this._validTrxParams.gasPriceMin || txParams.gasPrice > this._validTrxParams.gasPriceMax) {
        return 'gas price specified ' + txParams.gasPrice + ' is not in the allowed range: ' + this._validTrxParams.gasPriceMin + '-' + this._validTrxParams.gasPriceMax;
      }
    }
    if ('from' in txParams) {
      if (!this._web3.utils.isAddress(txParams.from)) {
        return 'the from address specified ' + txParams.from + ' is not a valid Ethereum address' + this._validTrxParams.gasPriceMin + '-' + this._validTrxParams.gasPriceMax;
      }
    }
    return null;
  }
}

module.exports = EnigmaContractWriterAPI;
