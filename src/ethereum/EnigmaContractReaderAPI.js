 class EnigmaContractReaderAPI {

    constructor (enigmaContractAddress, enigmaContractABI, web3) {
        this._enigmaContract = new web3.eth.Contract(enigmaContractABI, enigmaContractAddress);
        this._web3 = web3;
        this._activeEventSubscriptions = {};
    }
    w3() {
        return this._web3;
    }
    // let reader = EnigmaContractReaderAPI.build(params..)
    // static build(params){
    //     return new EnigmaContractReaderAPI(params);
    // }
    isDeployed(secrectContractAddress) {
        //let v = this.enigmaContract.isDeployed.call(secrectContractAddress);
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.isDeployed(secrectContractAddress).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    getCodeHash(secrectContractAddress) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getCodeHash(secrectContractAddress).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    countSecretContracts() {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.countSecretContracts().call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    getSecretContractAddresses(start, stop) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getSecretContractAddresses(start, stop).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    countStateDeltas(secrectContractAddress) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.countStateDeltas(secrectContractAddress).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    getStateDeltaHash(secrectContractAddress, index) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getStateDeltaHash(secrectContractAddress, index).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    getStateDeltaHashes(secrectContractAddress, start, stop) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getStateDeltaHashes(secrectContractAddress, start, stop).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    isValidDeltaHash(secrectContractAddress, delatHash) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.isValidDeltaHash(secrectContractAddress, delatHash).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    getWorkerParams(blockNumber) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getWorkerParams(blockNumber).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    getWorkersParams(blockNumber) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getWorkersParams(blockNumber).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                // TODo: verify correction once implementation is done
                const params = {
                    firstBlockNumber: parseInt(result[0]),
                    seed: parseInt(result[1]),
                    workers: result[2],
                    balances: result[3].map((x) => parseInt(x)),
                };
                resolve(params);
            });
        })
    }

    getWorkerGroup(blockNumber, secrectContractAddress) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getWorkerParams(blockNumber, secrectContractAddress).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }

    getReport(custodian) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getReport(custodian).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                const params = {
                    signer: data[0],
                    report: data[1]
                };
                resolve(params);
            });
        })
    }

    subscribe(eventName, filter, callback) {
        let eventWatcher = this._enigmaContract.events[eventName]({filter: filter}); 

        eventWatcher
            .on('data', callback)
            .on('changed', (e)=> { 
                console.log("recieved a change of the event ", e);
                if (eventName in this._activeEventSubscriptions) { 
                    delete(this._activeEventSubscriptions[eventName]); 
                }})
            .on('error', console.error);

        //let eventWatcher = this._enigmaContract[eventName](filter);
        // eventWatcher.then((err,result)=>{
        //     //let parsed = this._processors[eventName](err,result);
        //     //callback(err,parsed);
        //     callback(err, result);
        // });
        this._activeEventSubscriptions[eventName] = eventWatcher;
}
    unsubscribeAll() {
        for (const [eventName, eventWatcher] of Object.entries(this._activeEventSubscriptions)) {
            console.log("unsubscribing " + eventName);
            eventWatcher.unsubscribe();
            }
        return true;
    }
}


module.exports.EnigmaContractReaderAPI = EnigmaContractReaderAPI;