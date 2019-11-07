const EnigmaContractReaderAPI = require('./EnigmaContractReaderAPI');
const EnigmaContractWriterAPI = require('./EnigmaContractWriterAPI');
const EnigmaContractProductionWriterAPI = require('./EnigmaContractProductionWriterAPI');
const Logger = require('../common/logger');
const path = require('path');
const { exec, spawn } = require('child_process');
const Web3 = require('web3');
const utils = require('../common/utils');
const defaultsDeep = require('@nodeutils/defaults-deep');
const ethTestUtils = require('../../test/ethereum/utils');


TRUFFLE_DIR = path.join(__dirname, '../../test/ethereum/scripts');


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
    this.ethereumAddress = null;
    this.accountKey = null;
    this.minimunConfirmations = 12;
    this.environment = {};
    this.config = defaultConfig;

    if (logger) {
      this._logger = logger;
    } else {
      this._logger = new Logger({ 'cli': false });
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
   * set the Ethereum address to be used in all transactions
   * @param {string} address
   * @return {EnigmaContractAPIBuilder} this
   * */
  setEthereumAddress(address) {
    this.ethereumAddress = address;
    return this;
  }
  /**
   * set the Ethereum account key to be used in all transactions
   * @param {string} key
   * @return {EnigmaContractAPIBuilder} this
   * */
  setAccountKey(key) {
    this.accountKey = key;
    return this;
  }

  /**
     * Set the minimum confirmations (ethereum blocks) a worker has to wait
     * before knowing data is valid
     * Writing via the API will resolve only after enough confirmations
     * Reading via the API will return data only if it was written at least minimunConfirmations blocks ago
     * @param {number} minimunConfirmations, defaults to 12
     * @return {EnigmaContractAPIBuilder} this
     * */
  setMinimunConfirmations(minimunConfirmations = 12) {
    this.minimunConfirmations = minimunConfirmations;
    return this;
  }

  /**
   * deploy a smart contract
   *
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
      if (this.config.enigmaContractABI === undefined) {
        const rawdata = await utils.readFile((path.join(this.config.truffleDirectory, 'build/contracts/Enigma.json')));//require(path.join(truffleDirectory, 'build/contracts/Enigma.json'));
        const EnigmaContractJson = JSON.parse(rawdata);
        this.config.enigmaContractABI = EnigmaContractJson.abi;
      }
      await this._connectToContract();
    } else if (this.deployFlag) {
      await this._initEnv();
    }

    if (this.apiWriterFlag) {
      if (this.accountKey) {
        this.api = await new EnigmaContractProductionWriterAPI(this.enigmaContractAddress,
          this.enigmaContractABI, this.web3, this.logger(),
          this.ethereumAddress, this.accountKey, this.minimunConfirmations);
      }
      else {
        this.api = await new F(this.enigmaContractAddress, this.enigmaContractABI, this.web3, this.logger(), this.ethereumAddress);
      }
    }
    else {
      this.api = await new EnigmaContractReaderAPI(this.enigmaContractAddress, this.enigmaContractABI, this.web3, this.logger(), this.minimunConfirmations);
    }

    return {
      api: this.api,
      environment: this,
      enigmaContractAddress: this.enigmaContractAddress,
      url: this.config.url
    };
  }

  /**
   * configuring and building the api instance
   * @param {JSON} options
   *  {accountAddress - wallet address
   *   enigmaContractAddress - the deployed Enigma contract to connect to
   *   urlProvider - the transport url
   *   enigmaContractAbi - Enigma contract ABI
   *   accountKey - wallet key
   * @return {JSON} {api - the EnigmaContract API, environment - the environment for the api creation}
   * */
  async setConfigAndBuild(options) {
    let res;
    let ethereumAddress = null;

    // urlProvider: this._ethereumWebsocketProvider,
    // enigmaContractAddress: this._enigmaContractAddress,
    // accountAddress: this._ethereumAddress,
    // enigmaContractAbiPath: this._enigmaContractAbiPath,
    // accountKeyPath: this._ethereumKeyPath

    if (options.accountAddress) {
      ethereumAddress = options.accountAddress;
    }

    if (options.accountKey) {
      this.accountKey = options.accountKey;
    }

    if (options.enigmaContractAddress) {
      let config = { enigmaContractAddress: options.enigmaContractAddress };
      if (options.urlProvider) {
        config.url = options.urlProvider;
      }
      if (options.enigmaContractAbi) {
        config.enigmaContractABI = options.enigmaContractAbi;
      }
      res = await this.useDeployed(config).setEthereumAddress(ethereumAddress).build();
    }
    else {
      res = await this.createNetwork().deploy().setEthereumAddress(ethereumAddress).build();
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


    const truffleConfig = require(path.join(truffleDirectory, 'truffle'));

    const networkId = truffleConfig.networks.development.network_id;
    const rawdata = await utils.readFile((path.join(truffleDirectory, 'build/contracts/Enigma.json')));
    let EnigmaContractJson = JSON.parse(rawdata);

    this._initWeb3();

    await ethTestUtils.advanceXConfirmations(this.web3);

    this.enigmaContractAddress = EnigmaContractJson.networks[networkId].address;
    this.enigmaContractABI = EnigmaContractJson.abi;
    this.logger().info('Deployed the Enigma Mock Contract in the following address: ' + this.enigmaContractAddress);
  }

  _connectToContract() {
    this._initWeb3();

    // TODO: should a contract instance be created?!
    this.enigmaContractAddress = this.config.enigmaContractAddress;
    this.enigmaContractABI = this.config.enigmaContractABI;

    this.logger().info('Connecting to the Enigma Contract in the following address: ' + this.enigmaContractAddress);
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
    this.logger().debug('Network started');
    await utils.sleep(3000);
  }

  async _stop() {
    await process.kill(-this.environment.subprocess.pid);
    this.logger().debug('Stopping environment');
  }

  async _disconnect() {
    await this.web3.currentProvider.disconnect();
    this.logger().debug('Disconnecting from environment');
  }
}

module.exports = EnigmaContractAPIBuilder;
