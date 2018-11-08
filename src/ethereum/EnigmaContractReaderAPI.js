 class EnigmaContractReaderAPI {
    /**
     * {string} enigmaContractAddress
     * {Json} enigmaContractABI
     * {Web3} web3
     * */
    constructor (enigmaContractAddress, enigmaContractABI, web3) {
        this._enigmaContract = new web3.eth.Contract(enigmaContractABI, enigmaContractAddress);
        this._web3 = web3;
        this._activeEventSubscriptions = {};
    }
    w3() {
        return this._web3;
    }
    /**
     * check if a secret contract is deployed
     * @param {string} secrectContractAddress
     * @return {Promise} bool
     * */
    isDeployed(secrectContractAddress) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.isDeployed(secrectContractAddress).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }
    /**
     * get a secret contract hash
     * @param {string} secrectContractAddress
     * @return {Promise} string
     * */
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
    /**
     * count the number of deployed secret contracts
     * @return {Promise} number
     * */
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
    /**
     * return a list of addresses given a range
     * @param {Integer} from , including
     * @param {Integer} to , up to not including
     * @return {Promise} Array<string>
     * */
    getSecretContractAddresses(from, to) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getSecretContractAddresses(from, to).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }
    /**
     * get the number of state deltas in a secret contract
     * @param {string} secrectContractAddress
     * @return {Promise} number
     * */
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
    /**
     * get a hash of some delta
     * @param {string} secrectContractAddress
     * @param {Integer} index
     * @return {Promise} string
     * */
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
   /**
    * get a hashes list of some delta's range
    * @param {string} secrectContractAddress
    * @param {Integer} index
    * @return {Promise} Array<String>
    * */
    getStateDeltaHashes(secrectContractAddress, from, to) {
        return new Promise((resolve, reject) => {
            this._enigmaContract.methods.getStateDeltaHashes(secrectContractAddress, from, to).call((error, data)=> {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });
        })
    }
    /**
     * Validate a hash on-chain
     * @param {string} secrectContractAddress
     * @param {string} deltaHash
     * @return {Promise} boolean
     * */
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
    /**
     * Get the Worker parameters
     * @param {Integer} blockNumber //TODO:: check which time solidity expects, maybe BN ?
     * @return {Promise} //TODO:: what are the exact patameters that are returned?
     * */
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
    /**
     * //TODO:: what exactly this function does and what are the return params.
     * */
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
    /**
     * TODO:: what does it do?
     * */
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
    /**
     * // TODO:: what does it do ? what is the custodian type and value ?
     * */
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
    /**
     * //TODO:: complete + add event parsers
     * //TODO:: WTF is changed ?
     * //TODO:: validate that the callback works (err,val)
     * Listen to events emmited by the Enigma.sol contract and trigger a callback
     * @param {string} eventName
     * @param {Json} filter, incase a filter is required on top of the event itself. //TODO:: add an example HERE of a filter
     * @param {Function} callback (err,event)=>{} //TODO:: add the parameters that the function takes.
     * */
    subscribe(eventName, filter, callback) {
        let eventWatcher = this._enigmaContract.events[eventName]({filter: filter});

        eventWatcher
            .on('data', (event)=>{
                callback(null,event);
            })
            .on('changed', (e)=> {
                console.log("received a change of the event ", e);
                if (eventName in this._activeEventSubscriptions) {
                    delete(this._activeEventSubscriptions[eventName]);
                }})
            .on('error', callback);

        //let eventWatcher = this._enigmaContract[eventName](filter);
        // eventWatcher.then((err,result)=>{
        //     //let parsed = this._processors[eventName](err,result);
        //     //callback(err,parsed);
        //     callback(err, result);
        // });
        this._activeEventSubscriptions[eventName] = eventWatcher;
    }
    /**
     * Unsubscribe from all the subscribed events
     * @return {Boolean} success
     * */
    unsubscribeAll() {
        for (const [eventName, eventWatcher] of Object.entries(this._activeEventSubscriptions)) {
            console.log("unsubscribing " + eventName);
            eventWatcher.unsubscribe();
            }
        return true;
    }
}


module.exports = EnigmaContractReaderAPI;
