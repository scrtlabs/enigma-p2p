const EnigmaContractReaderAPI = require('./EnigmaContractReaderAPI');
const EnigmaContractWriterAPI = require('./EnigmaContractWriterAPI');
const path = require('path');
const { exec, spawn } = require('child_process');
const Web3 = require('web3');
const defaultsDeep = require('@nodeutils/defaults-deep');

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}


const defaultConfig = {
  websocket: 'ws://127.0.0.1:9545',
  truffleDirectory: path.join(__dirname, '../../test/ethereum/scripts')
};

class EnigmaContractAPIBuilder {
    constructor() {
        this.apiWriterFlag = true;
        this.createNetworkFlag = false;
        this.deployFlag = true;
        this.useDeployedFlag = false;
        this.web3 = null;
        this.api = null;
        this.environment ={};
        this.config = defaultConfig;
        return this;
    }

    onlyReader() {
        this.apiWriterFlag = false;
        return this;
    }
    /**
     * deploy a smart contract
     * @param {JSON} config - optional
     * {
     *  websocket - the transport uri
     *  truffleDirectory - the root of truffle workspace
     * }
     * */
    deploy(config) {
       this.deployFlag = true;
       if (config !== undefined && config !== null) {
            this.config = defaultsDeep(config, this.config);
        }
       return this;
    }

    useDeployed(config) {
        this.useDeployedFlag = true;
        if (config !== undefined && config !== null) {
             this.config = defaultsDeep(config, this.config);
        }
        // TODO: improve this code!
        // console.log('here');
        // console.log(this.config.enigmaContractABI === undefined);
        if (this.config.enigmaContractABI === undefined){
            const EnigmaContractJson = require(path.join(this.config.truffleDirectory, "build/contracts/EnigmaMock.json"));
            this.config.enigmaContractABI = EnigmaContractJson.abi;
            //console.log(this.config.enigmaContractABI);
        }
        return this;
     }
    /**
     * initialize a network instance
     * @param {JSON} config
     * {
     *  websocket - the transport uri
     *  truffleDirectory - the root of truffle workspace
     * }
     * */
    createNetwork(config) {
        this.createNetworkFlag = true;
        if (config !== undefined && config !== null) {
            this.config = defaultsDeep(config, this.config);
        }
        return this;
    }

    async build() {
        if (this.createNetworkFlag) {
            await this._startNetwork();
        }

        if (this.useDeployedFlag) {
            await this._connectToContract();
        }

        else if (this.deployFlag) {
            await this._initEnv();
        }

        if (this.apiWriterFlag) {
            this.api = await new EnigmaContractWriterAPI(this.enigmaContractAddress, this.enigmaContractABI, this.web3);
        }
        else {
            this.api = await new EnigmaContractReaderAPI(this.enigmaContractAddress, this.enigmaContractABI, this.web3);
        }

        return {api : this.api, environment: this};
    }

    _resetEnv(truffleDirectory) {
        return new Promise((resolve, reject) => {
            const command = 'cd ' + truffleDirectory + ' && truffle migrate --reset && cd ' + process.cwd();
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    //console.log(err);
                    reject();
                }
                resolve(stderr, stdout);
                //console.log(stdout);
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
                resolve(stderr, stdout);
                //console.log(stdout);
            })
        })
    }

    async _initEnv() {
        const truffleDirectory = this.config.truffleDirectory;

        await this._buildEnv(truffleDirectory);//.then(console.log).catch(console.log);
        await this._resetEnv(truffleDirectory);//.then(console.log).catch(console.log);

        const EnigmaContractJson = require(path.join(truffleDirectory, "build/contracts/EnigmaMock.json"));
        const EnigmaTokenContractJson = require(path.join(truffleDirectory, "build/contracts/EnigmaToken.json"));

        this._initWeb3();

        const accounts = await this.web3.eth.getAccounts();

        const sender1 = accounts[0];
        const sender2 = accounts[1];
        const principal = accounts[2];

        let enigmaTokenContract = new this.web3.eth.Contract(EnigmaTokenContractJson.abi);

        let enigmaTokenContractInstance = await enigmaTokenContract.deploy({data: EnigmaTokenContractJson.bytecode, arguments: []})
            .send({
                from: sender1,
                gas: 1500000,
                //gasPrice: '100000000000'
            });

        let enigmaContract = new this.web3.eth.Contract(EnigmaContractJson.abi);
        let enigmaContractInstance = await enigmaContract.deploy({
            data: EnigmaContractJson.bytecode,
            arguments: [enigmaTokenContractInstance.options.address, principal]
            }).send({
                    from: sender2,
                    gas: 6500000//4500000,
                    //gasPrice: '100000000000'
                });

        this.enigmaContractAddress = enigmaContractInstance.options.address;
        this.enigmaContractABI = EnigmaContractJson.abi;
        console.log("Deployed the Enigma Mock Contract in the following address: " + this.enigmaContractAddress);
    }

    _connectToContract() {
        this._initWeb3();

        // TODO: should a contract instance be created?!
        this.enigmaContractAddress = this.config.enigmaContractAddress;
        this.enigmaContractABI = this.config.enigmaContractABI;
    }

    _initWeb3() {
        const websocketProvider = this.config.websocket;
        const provider = new Web3.providers.WebsocketProvider(websocketProvider);

        // from https://github.com/ethereum/web3.js/issues/1354
        provider.on('error', e => console.error('WS Error: ', e));
        provider.on('end', e => console.log('WS End'));

        this.web3 = new Web3(provider);
    }

    async _startNetwork() {
        const truffleDirectory = this.config.truffleDirectory;
        const command = 'cd ' + truffleDirectory + ' && truffle develop';
        this.environment.subprocess = spawn(command, {
            shell: true,
            detached: true,
        });

        this.environment.subprocess.unref();

        await sleep(3000);
    }

    async destroy() {
        if (this.createNetworkFlag) {
            await this.stop();
        }
        await this.disconnect();
    }

    async stop() {
        await this.environment.subprocess.kill();
    }

    async disconnect() {
        await this.web3.currentProvider.disconnect();
    }
}

module.exports = EnigmaContractAPIBuilder;
