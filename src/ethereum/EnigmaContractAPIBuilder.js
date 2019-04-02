const EnigmaContractReaderAPI = require('./EnigmaContractReaderAPI');
const EnigmaContractWriterAPI = require('./EnigmaContractWriterAPI');
const Logger = require('../common/logger');
const path = require('path');
const {exec, spawn} = require('child_process');
const Web3 = require('web3');
const defaultsDeep = require('@nodeutils/defaults-deep');

TRUFFLE_DIR = path.join(__dirname, '../../test/ethereum/scripts');
const truffleConfig = require(path.join(TRUFFLE_DIR, 'truffle'));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const defaultConfig = {
  url: 'ws://127.0.0.1:9545',
  truffleDirectory: TRUFFLE_DIR,
};

class EnigmaContractAPIBuilder {
  constructor(logger) {
    this.apiWriterFlag = true;
    this.createNetworkFlag = false;
    this.deployFlag = true;
    this.useDeployedFlag = false;
    this.web3 = null;
    this.api = null;
    this.environment ={};
    this.config = defaultConfig;

    if (logger) {
      this._logger = logger;
    } else {
      this._logger = new Logger({'cli': false});
    }

    return this;
  }

  /**
   * get the logger
   * @return {Logger} logger
   * */
  logger() {
    return this._logger;
  }

  /**
   * create a EnigmaContractReaderAPI object
   * */
  onlyReader() {
    this.apiWriterFlag = false;
    return this;
  }
  /**
   * deploy a smart contract
   * @param {JSON} config - optional
   * {
   *  url - the transport url
   *  truffleDirectory - the root of truffle workspace
   * }
   * @return {EnigmaContractAPIBuilder} this
   * */
  deploy(config) {
    this.deployFlag = true;
    if (config !== undefined && config !== null) {
      this.config = defaultsDeep(config, this.config);
    }
    return this;
  }
  /**
   * deploy a smart contract
   * @param {JSON} config - optional
   * {
   *  url - the transport url
   *  truffleDirectory - the root of truffle workspace
   * }
   * */
  useDeployed(config) {
    this.useDeployedFlag = true;
    if (config !== undefined && config !== null) {
      this.config = defaultsDeep(config, this.config);
    }
    if (this.config.enigmaContractABI === undefined) {
      const EnigmaContractJson = require(path.join(this.config.truffleDirectory, 'build/contracts/Enigma.json'));
      this.config.enigmaContractABI = EnigmaContractJson.abi;
    }
    return this;
  }
  /**
   * initialize a network instance
   * @param {JSON} config
   * {
   *  url - the transport url
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

  /**
   * build the api instance
   * @return {JSON} {api - the EnigmaContract API, environment - the environment for the api creation}
   * */
  async build() {
    if (this.createNetworkFlag) {
      await this._startNetwork();
    }

    if (this.useDeployedFlag) {
      await this._connectToContract();
    } else if (this.deployFlag) {
      await this._initEnv();
    }

    if (this.apiWriterFlag) {
      this.api = await new EnigmaContractWriterAPI(this.enigmaContractAddress, this.enigmaContractABI, this.web3, this.logger());
    } else {
      this.api = await new EnigmaContractReaderAPI(this.enigmaContractAddress, this.enigmaContractABI, this.web3, this.logger());
    }

    return {
      api: this.api,
      environment: this,
      enigmaContractAddress: this.enigmaContractAddress,
      url: this.config.url
    };
  }

  /**
   * configuraing and building the api instance
   * @param {String} enigmaContractAddress - the deployed Enigma contract to connect to
   * @param {String} url - the transport url
   * @return {JSON} {api - the EnigmaContract API, environment - the environment for the api creation}
   * */
  async setConfigAndBuild(enigmaContractAddress, url) {
    let res;

    if (enigmaContractAddress) {
      let config = {enigmaContractAddress: enigmaContractAddress};
      if (url) {
        config.url = url;
      }
      res = await this.useDeployed(config).build();
    } else {
      res = await this.createNetwork().deploy().build();
    }
    return res;
  }

  /**
   * destroy the environment created in the initialization
   * */
  async destroy() {
    if (this.createNetworkFlag) {
      await this._stop();
    }
    await this._disconnect();
  }

  /**** INTERNAL ****/
  _resetEnv(truffleDirectory) {
    return new Promise((resolve, reject) => {
      const command = 'cd ' + truffleDirectory + ' && truffle migrate --reset && cd ' + process.cwd();
      exec(command, (err, stdout, stderr) => {
        if (err) {
          reject('ApiBuilder.resetEnv ' + err);
        }
        resolve(stderr, stdout);
      });
    });
  }

  _buildEnv(truffleDirectory) {
    return new Promise((resolve, reject) => {
      const command = 'cd ' + truffleDirectory + ' && truffle compile && cd ' + process.cwd();
      exec(command, (err, stdout, stderr) => {
        if (err) {
          reject('ApiBuilder.buildEnv ' + err);
        }
        resolve(stderr, stdout);
      });
    });
  }

  async _initEnv() {
    const truffleDirectory = this.config.truffleDirectory;

    await this._buildEnv(truffleDirectory);// .then(this.logger()).catch(this.logger());
    await this._resetEnv(truffleDirectory);// .then(this.logger()).catch(this.logger());

    const networkId = truffleConfig.networks.development.network_id;
    const EnigmaContractJson = require(path.join(truffleDirectory, 'build/contracts/Enigma.json'));
    // const EnigmaContractJson = require(path.join(truffleDirectory, 'build/contracts/EnigmaMock.json'));
    // const EnigmaTokenContractJson = require(path.join(truffleDirectory, 'build/contracts/EnigmaToken.json'));

    this._initWeb3();

/*    const accounts = await this.web3.eth.getAccounts();

    const sender1 = accounts[0];
    const sender2 = accounts[1];
    const principal = accounts[2];

    const enigmaTokenContract = new this.web3.eth.Contract(EnigmaTokenContractJson.abi);

    const enigmaTokenContractInstance = await enigmaTokenContract.deploy(
      {data: EnigmaTokenContractJson.bytecode, arguments: []})
      .send({
        from: sender1,
        gas: 1500000,
        // gasPrice: '100000000000'
      });

    const enigmaContract = new this.web3.eth.Contract(EnigmaContractJson.abi);
    const enigmaContractInstance = await enigmaContract.deploy({
      data: EnigmaContractJson.bytecode,
      arguments: [enigmaTokenContractInstance.options.address, principal],
    }).send({
      from: sender2,
      gas: 6500000, // 4500000,
      // gasPrice: '100000000000'
    });*/

    this.enigmaContractAddress = EnigmaContractJson.networks[networkId].address;
    this.enigmaContractABI = EnigmaContractJson.abi;
    this.logger().info('Deployed the Enigma Mock Contract in the following address: ' + this.enigmaContractAddress);
  }

  _connectToContract() {
    this._initWeb3();

    // TODO: should a contract instance be created?!
    this.enigmaContractAddress = this.config.enigmaContractAddress;
    this.enigmaContractABI = this.config.enigmaContractABI;

    this.logger().info('Connecting to the Enigma Mock Contract in the following address: ' + this.enigmaContractAddress);
  }

  _initWeb3() {
    if (!this.config.url.startsWith('ws:')) {
      throw new Error("wrong transport config. Only websocket is currently supported");
    }

    const websocketProvider = this.config.url;
    const provider = new Web3.providers.WebsocketProvider(websocketProvider);

    // from https://github.com/ethereum/web3.js/issues/1354
    provider.on('error', (e) => this.logger().error('WS Error: ', e));
    provider.on('end', (e) => this.logger().info('WS End'));

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

  async _stop() {
    await this.environment.subprocess.kill();
  }

  async _disconnect() {
    await this.web3.currentProvider.disconnect();
  }
}

module.exports = EnigmaContractAPIBuilder;
