const EnigmaContractReaderAPI = require('./EnigmaContractReaderAPI');
const EnigmaContractWriterAPI = require('./EnigmaContractWriterAPI');

//const config = require('./config.json');

const config = {websocket: 'ws://127.0.0.1:9545'}
const path = require('path');

const { exec, spawn } = require('child_process');
const Web3 = require('web3');

const truffleDir = '../../test/ethereum/scripts';

 
//const testUtils = require('../../testUtils/utils');

const util = require('util')
//let subprocess; // Global `trufffle develop` "child process" object 

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}


function destroy(api, env) {
    //console.log("this in destroy=" + util.inspect(this));
    api.w3().currentProvider.disconnect();
    env.subprocess.kill();
    //this._stop(env);
    //this._disconnect(api);
    
}


class EnigmaContractAPIBuilder {
    constructor() {
        this.apiWriterFlag = true;
        this.createNetworkFlag = true;
        this.enviroment = {}
        this.web3 = null;
        this.api = null;
        return this;
    }
    
    onlyReader() {
        this.apiWriterFlag = false;
        return this;
    }
    
    // deploy() {
    //    this.deployFlag = true;
    //    return this;
    // }
    
    createNetwork() {
        this.createNetworkFlag = true;
        return this;
    }
    
    async build() {       
        //await this._initEnv(truffleDir);

        let stopCallback = null;

        //console.log("start");    
        if (this.createNetworkFlag) {
            //console.log("truffleDir=" + truffleDir);
            await this._startNetwork(truffleDir);
            await this._initEnv(truffleDir);
            stopCallback = destroy;   
        }

        //console.log("here");
        if (this.apiWriterFlag) {
            this.api = await new EnigmaContractWriterAPI(this.enigmaContractAddress, this.enigmaContractABI, this.web3); 
        }
        else {
            this.api = await new EnigmaContractReaderAPI(this.enigmaContractAddress, this.enigmaContractABI, this.web3);
        } 

        return {api : this.api, stopCallback : stopCallback, enviroment: this.enviroment};
    }

    _resetEnv(truffleDirectory) {
        return new Promise((resolve, reject) => {
            //console.log("process.cwd()=" + process.cwd());
            const command = 'cd ' + truffleDirectory + ' && truffle migrate --reset && cd ' + process.cwd();
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    reject();
                }
                resolve(stderr, stdout);
            })
        })
    }

    _buildEnv(truffleDirectory) {
        return new Promise((resolve, reject) => {
            const command = 'cd ' + truffleDirectory + ' && truffle compile && cd ' + process.cwd();
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    reject();
                }
                resolve(stderr, stdout);
            })
        })
    }
    async _initEnv(truffleDirectory) {
        //console.log("strating _initEnv ");    

        await this._buildEnv(truffleDirectory);//.then(console.log).catch(console.log);
        await this._resetEnv(truffleDirectory);//.then(console.log).catch(console.log);
    
        // console.log("truffleDirectory= " + truffleDirectory);
        // console.log("path.join=" + path.join('../a', 'b/c'));
        // console.log("EnigmaContractJson= " + path.join(truffleDirectory, "build/contracts/EnigmaMock.json"));   
        // console.log("EnigmaTokenContractJson= " + path.join(truffleDirectory, "build/contracts/EnigmaToken.json"));   

        const EnigmaContractJson = require(path.join(truffleDirectory, "build/contracts/EnigmaMock.json"));
        const EnigmaTokenContractJson = require(path.join(truffleDirectory, "build/contracts/EnigmaToken.json"));
    
        const websocketProvider = config.websocket;
        const provider = new Web3.providers.WebsocketProvider(websocketProvider);

        // console.log("here ");   
        
        // from https://github.com/ethereum/web3.js/issues/1354
        provider.on('error', e => console.error('WS Error: ', e)); // provider.on('error', e => console.error('WS Error', e));
        provider.on('end', e => console.log('WS End')); // provider.on('end', e => console.error('WS End', e));
        
        this.web3 = new Web3(provider);
    
        const accounts = await this.web3.eth.getAccounts();
    
        const sender1 = accounts[0];
        const sender2 = accounts[1];
        const principal = accounts[2];//'0x627306090abab3a6e1400e9345bc60c78a8bef57';
    
        //console.log("here 2");   
        let enigmaTokenContract = new this.web3.eth.Contract(EnigmaTokenContractJson.abi);
      
        let enigmaTokenContractInstance = await enigmaTokenContract.deploy({data: EnigmaTokenContractJson.bytecode, arguments: []})
            .send({
                from: sender1,
                gas: 1500000,
                //gasPrice: '100000000000'
            });
    
        //console.log('using account', principal, 'as principal signer');
        
        let enigmaContract = new this.web3.eth.Contract(EnigmaContractJson.abi);
        let enigmaContractInstance = await enigmaContract.deploy({
            data: EnigmaContractJson.bytecode, 
            arguments: [enigmaTokenContractInstance.options.address, principal]
            }).send({
                    from: sender2,
                    gas: 6500000//4500000,
                    //gasPrice: '100000000000'
                });
        
        // console.log("here 3");   
        
        this.enigmaContractAddress = enigmaContractInstance.options.address;
        this.enigmaContractABI = EnigmaContractJson.abi;

        // console.log("ending _initEnv ");    
    }

    async _startNetwork(truffleDirectory) {
        // console.log("strating _startNetwork ");   
        const command = 'cd ' + truffleDirectory + ' && truffle develop';
        this.enviroment.subprocess = spawn(command, {
            shell: true,
            detached: true,
        });
            
        this.enviroment.subprocess.unref();
    
        await sleep(3000);
        // console.log("ending _startNetwork ");  
    }
    
    async stop() {
        await this.enviroment.subprocess.kill();
        console.log("ending stop ");  
    }
    
    
    async disconnect() {
        await this.web3.currentProvider.disconnect();
        console.log("ending disconnect "); 
    }
}



module.exports = EnigmaContractAPIBuilder;  





// async function registerWorker(api, workerEnclaveSigningAddress, workerReport, workerAddress) {
//     let regTx = await api.register(workerEnclaveSigningAddress, workerReport, {from : workerAddress});
//     console.log("worker " + workerAddress + " registred; reciept=" + regTx);
// }

// async function deposit(api, workerAddress, amount) {
//     let reciept = await api.deposit(workerAddress, amount, {from : workerAddress});
//     console.log("worker " + workerAddress + " deposited; reciept=" + reciept);
// }

// async function deploySecretContract(api, secretContractAddress, workerEnclaveSigningAddress, codeHash, workerAddress) { 
//     let depTx = await api.deploySecretContract(secretContractAddress, codeHash, workerAddress, workerEnclaveSigningAddress, {from : workerAddress});
//     console.log("secret contracts " + secretContractAddress + " deployed. reciept=" + depTx);    
// }

// async function createTaskRecord(api, taskId, fee, token, tokenValue, workerAddress) {
//     let reciept = await api.createTaskRecord(taskId, fee, token, tokenValue, {from : workerAddress});
//     console.log("task record created. reciept=" + reciept);   

// }

// async function createTaskRecords(api, taskIds, fees, tokens, tokenValues, workerAddress) {
//     let reciept = await api.createTaskRecords(taskIds, fees, tokens, tokenValues, {from : workerAddress});
//     console.log("task records created. reciept=" + reciept);   

// }

// function eventSubscribe(api, eventName, filter, callback) {
//     api.subscribe(eventName, filter, callback);
//     console.log("subscribed to " + eventName);   

// }

// async function readInfo(api, secretContractAddress, scStart, scStop, deltaStart, delatStop, workerAddress) {
//     let count = await api.countSecretContracts();
//     console.log("secret contracts count=" + count);

//     let isDeployed = await api.isDeployed(secretContractAddress);
//     console.log("secret contract " + secretContractAddress + " is deployed=" + isDeployed);

//     let codeHash = await api.getCodeHash(secretContractAddress);
//     console.log("secret contract " + secretContractAddress + " code Hash=" + codeHash);

//     let addresses = await api.getSecretContractAddresses(scStart, scStop);
//     console.log("secret contract array from " + scStart + " to " + scStop + " =" + addresses);

//     let countStateDeltas = await api.countStateDeltas(secretContractAddress);
//     console.log("secret contract " + secretContractAddress + " state deltas count=" + countStateDeltas);

//     let report = await api.getReport(workerAddress);
//     console.log("worker " + workerAddress + " report=" + JSON.stringify(report));
// }

// function getEventRecievedFunc(eventName) {
//     return (event)=> {console.log("recieved " + eventName + " event: ", event)}
// }


// async function runTest() {
//     let builder = new EnigmaContractAPIBuilder();
//     res = await builder.createNetwork().build();
//     let api = res.api;

//     const accounts = await api.w3().eth.getAccounts();
//     const workerAddress = accounts[0];
//     const tokenAddress = accounts[1];
//     const secretContractAddress = "0x821aea9a577a9b44299b9c15c88cf3087f3b5544";
//     const workerEnclaveSigningAddress = "0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef";

//     eventSubscribe(api, "Registered", {}, getEventRecievedFunc("Registered"));
//     eventSubscribe(api, "DepositSuccessful", {}, getEventRecievedFunc("DepositSuccessful"));
    
//     await registerWorker(api, workerEnclaveSigningAddress, "0x123456", workerAddress);
//     await deposit(api, workerAddress, 1000);
//     await deploySecretContract(api, secretContractAddress, workerEnclaveSigningAddress, "0x7890", workerAddress);
//     await readInfo(api, secretContractAddress, 0, 0, 0, 0, workerAddress);
//     await createTaskRecord(api, "0x555", 50, tokenAddress, 100, workerAddress);
//     await createTaskRecords(api, ["0x111", "0x222"], [50, 20], [tokenAddress, tokenAddress], [100, 200], workerAddress);

//     res.stopCallback(api, res.enviroment);
//     //await builder.disconnect();
//     //builder.disconnect();
//     //await builder.stop();
// }




// runTest();

