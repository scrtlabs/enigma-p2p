const EnigmaContractReaderAPI = require('./EnigmaContractReaderAPI');
const EnigmaContractWriterAPI = require('./EnigmaContractWriterAPI');

//const config = require('./config.json');

const config = {websocket: 'ws://127.0.0.1:9545'}
const path = require('path');

const { exec, spawn } = require('child_process');
const Web3 = require('web3');

const truffleDir = path.join(__dirname, '../../test/ethereum/scripts');

 
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
                    //console.log(err);
                    reject();
                }
                //console.log(stdout);
                resolve(stderr, stdout);
            })
        })
    }

    _buildEnv(truffleDirectory) {
        return new Promise((resolve, reject) => {
            const command = 'cd ' + truffleDirectory + ' && truffle compile && cd ' + process.cwd();
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    //console.log(err);
                    reject();
                }
                //console.log(stdout);
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
