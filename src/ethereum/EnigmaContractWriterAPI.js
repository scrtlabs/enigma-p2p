const defaultsDeep = require('@nodeutils/defaults-deep');

const EnigmaContractReaderAPI = require('./EnigmaContractReaderAPI');
//TODO:: delegate the configuration load to the caller from the outside + allow dynamic path (because the caller is responsible).
const config = require('./config.json');

class EnigmaContractWriterAPI extends EnigmaContractReaderAPI {

    constructor (enigmaContractAddress, enigmaContractABI, web3) {
        super(enigmaContractAddress,enigmaContractABI,web3);
    }
    /**
     * Step 1 in registration
     * Register a worker to the network.
     * @param {string} signerAddress ,
     * @param {string} report , worker
     * @param {JSON} txParams
     * @return {Promise} receipt
     * */
    register(signerAddress, report, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.default;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined && txParams !== null) {
                let error = this._validateTxParams(txParams)
                if (error !== null)
                {
                    reject(error);
                    return;
                }
                transactionOptions = defaultsDeep(defaultOptions, txParams);
            }
            this._enigmaContract.methods.register(signerAddress, this._web3.utils.asciiToHex(report))
                .send(transactionOptions, (error, receipt)=> {
                    if (error) {
                        reject(error);
                    }
                    resolve(receipt);
            });
        })
    }
    /**
     * Step 2 in registration : stake ENG's (TO DA MOON)
     * @param {string} custodian - the worker address
     * @param {Integer} amount
     * @param {JSON} txParams
     * */
    deposit(custodian, amount, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.default;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined && txParams !== null) {
                let error = this._validateTxParams(txParams)
                if (error !== null)
                {
                    reject(error);
                    return;
                }
                transactionOptions = defaultsDeep(defaultOptions, txParams);
            }
            this._enigmaContract.methods.deposit(custodian, amount).send(transactionOptions, (error, receipt)=> {
                if (error) {
                    reject(error);
                }
                resolve(receipt);
            });
        })
    }
    /**
     * deploy a secret contract by a worker
     * @param {string} secretContractAddress
     * @param {string} codeHash
     * @param {string} ownerAddress
     * @param {string} signature //TODO:: since it expects bytes maybe here it will be bytes as well (Json-san)
     * @param {JSON} txParams
     * @return {Promise} receipt //TODO:: we want to turn all the Json's into real classes.
     * */
    deploySecretContract(secretContractAddress, codeHash, ownerAddress, signature, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.default;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined && txParams !== null) {
                let error = this._validateTxParams(txParams)
                if (error !== null)
                {
                    reject(error);
                    return;
                }
                transactionOptions = defaultsDeep(txParams,defaultOptions);
            }
            this._enigmaContract.methods.deploySecretContract(secretContractAddress, codeHash, ownerAddress, signature).send(transactionOptions, (error, receipt)=> {
                if (error) {
                    reject(error);
                }
                resolve(receipt);
            });
        })
    }
    /**
     * Irrelevant for workers -> users create tasks with it
     * */
    createTaskRecord(taskId, fee, token, tokenValue, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.default;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined && txParams !== null) {
                let error = this._validateTxParams(txParams)
                if (error !== null)
                {
                    reject(error);
                    return;
                }
                transactionOptions = defaultsDeep(txParams,defaultOptions);
            }
            this._enigmaContract.methods.createTaskRecord(taskId, fee, token, tokenValue).send(transactionOptions, (error, receipt)=> {
                if (error) {
                    reject(error);
                }
                resolve(receipt);
            });
        })

    }
    /**
     * Same as above
     * */
    createTaskRecords(taskIds, fees, tokens, tokenValues, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.default;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined && txParams !== null) {
                let error = this._validateTxParams(txParams)
                if (error !== null)
                {
                    reject(error);
                    return;
                }
                transactionOptions = defaultsDeep(txParams,defaultOptions);
            }
            this._enigmaContract.methods.createTaskRecords(taskIds, fees, tokens, tokenValues).send(transactionOptions, (error, receipt)=> {
                if (error) {
                    reject(error);
                }
                resolve(receipt);
            });
        })

    }
    /**
     * Worker commits the results on-chain
     * @param {string} secretContractAddress
     * @param {string} taskId
     * @param {string} inStateDeltaHash
     * @param {string} outStateDeltaHash
     * @param {string} ethCall
     * @param {string} signature
     * @param {JSON} txParams
     * @return {Promise} receipt
     * */
    commitReceipt(secretContractAddress, taskId, inStateDeltaHash, outStateDeltaHash, ethCall, signature, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.default;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined && txParams !== null) {
                let error = this._validateTxParams(txParams)
                if (error !== null)
                {
                    reject(error);
                    return;
                }
                transactionOptions = defaultsDeep(txParams,defaultOptions);
            }
            this._enigmaContract.methods.commitReceipt(secretContractAddress, taskId, inStateDeltaHash, outStateDeltaHash, ethCall, signature)
                .send(transactionOptions, (error, receipt)=> {
                if (error) {
                    reject(error);
                }
                resolve(receipt);
            });
        })
    }
    /** same as above but for a batch */
    commitReceipts(secretContractAddresses, taskIds, inStateDeltaHashes, outStateDeltaHashes, ethCall, signature, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.default;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined && txParams !== null) {
                let error = this._validateTxParams(txParams)
                if (error !== null)
                {
                    reject(error);
                    return;
                }
                transactionOptions = defaultsDeep(txParams,defaultOptions);
            }
            this._enigmaContract.methods.commitReceipts(secretContractAddresses, taskIds, inStateDeltaHashes, outStateDeltaHashes, ethCall, signature)
                .send(transactionOptions, (error, receipt)=> {
                if (error) {
                    reject(error);
                }
                resolve(receipt);
            });
        })
    }
    /** used by the principal node to commit a random number === new epoch */
    setWorkersParams(seed, signature, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.default;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined && txParams !== null) {
                let error = this._validateTxParams(txParams)
                if (error !== null)
                {
                    reject(error);
                    return;
                }
                transactionOptions = defaultsDeep(txParams,defaultOptions);
            }
            this._enigmaContract.methods.setWorkersParams(seed, signature)
                .send(transactionOptions, (error, receipt)=> {
                if (error) {
                    reject(error);
                }
                resolve(receipt);
            });
        })
    }
    _validateTxParams(txParams) {
        if ('gas' in txParams) {
            if (txParams.gas < config.valid.gasMin || txParams.gas > config.valid.gasMax) {
                return 'gas limit specified ' + txParams.gas + ' is not in the allowed range: ' + config.valid.gasMin + '-' + config.valid.gasMax;
            }
        }
        if ('gasPrice' in txParams) {
            if (txParams.gasPrice < config.valid.gasPriceMin || txParams.gasPrice > config.valid.gasPriceMax) {
                return 'gas price specified ' + txParams.gasPrice + ' is not in the allowed range: ' + config.valid.gasPriceMin + '-' + config.valid.gasPriceMax;
            }
        }
        if ('from' in txParams) {
            if (!this._web3.utils.isAddress(txParams.from)) {
                return 'the from address specified ' + txParams.from + ' is not a valid Ethereum address'; + config.valid.gasPriceMin + '-' + config.valid.gasPriceMax;
            }
        }
        return null;
    }
}

module.exports = EnigmaContractWriterAPI;
