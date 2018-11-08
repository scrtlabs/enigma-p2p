const defaultsDeep = require('@nodeutils/defaults-deep');

const enigmaContractReaderApi = require('./EnigmaContractReaderAPI');

const config = require('./config.json');

class EnigmaContractWriterAPI extends enigmaContractReaderApi.EnigmaContractReaderAPI {
    
    register(signerAddress, report, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined) {
                transactionOptions = defaultsDeep(defaultOptions, txParams);
            }
            this._enigmaContract.methods.register(signerAddress, report).send({gas:300000, from : "0x627306090abab3a6e1400e9345bc60c78a8bef57"}, (error, receipt)=> {
                if (error) {
                    reject(error);
                }
                resolve(receipt);
            });
        })
    }
    
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

    deploySecretContract(secretContractAddress, codeHash, ownerAddress, signature, txParams) {
        return new Promise((resolve, reject) => {
            let defaultOptions = config.send.options;
            let transactionOptions = defaultOptions;
            if (txParams !== undefined) {
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

module.exports.EnigmaContractWriterAPI = EnigmaContractWriterAPI;