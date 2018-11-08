const defaultsDeep = require('@nodeutils/defaults-deep');

const EnigmaContractReaderAPI = require('./EnigmaContractReaderAPI');

const config = require('./config.json');

class EnigmaContractWriterAPI extends EnigmaContractReaderAPI {
    constructor (enigmaContractAddress, enigmaContractABI, web3) {
        super(enigmaContractAddress,enigmaContractABI,web3);
    }
    /**
     * Step 1 in registration
     * //TODO:: validate txParams correctness
     * Register a worker to the network.
     * @param {string} signerAddress ,
     * @param {string} report , worker
     * @param {JSON} txParams
     * @return {Promise} receipt
     * */
    register(signerAddress, report, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined) {
                transactionOptions = defaultsDeep(defaultOptions, txParams);
            }
            this._enigmaContract.methods.register(signerAddress, report).send(transactionOptions, (error, receipt)=> {
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
     * @param {Integer} amount , // TODO:: validate which type it expects maybe str (to avoid overflow)
     * @param {JSON} txParams , // TODO:: validate correctness using AI
     * */
    deposit(custodian, amount, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined) {
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
     * @param {JSON} txParams //TODO:: validate correctness
     * @return {Promise} receipt //TODO:: we want to turn all the Json's into real classes.
     * */
    deploySecretContract(secretContractAddress, codeHash, ownerAddress, signature, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined && txParams !== null) {
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
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined) {
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
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined) {
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
     * @param {string} secrectContractAddress
     * @param {string} taskId
     * @param {string} inStateDeltaHash
     * @param {string} outStateDeltaHash
     * @param {string} ethCall
     * @param {string} signature
     * @param {JSON} txParams
     * @return {Promise} receipt
     * */
    commitReceipt(secrectContractAddress, taskId, inStateDeltaHash, outStateDeltaHash, ethCall, signature, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined) {
                transactionOptions = defaultsDeep(txParams,defaultOptions);
            }
            this._enigmaContract.methods.commitReceipt(secrectContractAddress, taskId, inStateDeltaHash, outStateDeltaHash, ethCall, signature)
                .send(transactionOptions, (error, receipt)=> {
                if (error) {
                    reject(error);
                }
                resolve(receipt);
            });
        })
    }
    /** same as above but for a batch */
    commitReceipts(secrectContractAddresses, taskIds, inStateDeltaHashes, outStateDeltaHashes, ethCall, signature, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined) {
                transactionOptions = defaultsDeep(txParams,defaultOptions);
            }
            this._enigmaContract.methods.commitReceipts(secrectContractAddresses, taskIds, inStateDeltaHashes, outStateDeltaHashes, ethCall, signature)
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
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined) {
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
}

module.exports = EnigmaContractWriterAPI;
