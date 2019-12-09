const EthereumServices = require("./EthereumServices");
const EthereumVerifier = require("./EthereumVerifier");
const EnigmaContractAPIBuilder = require("./EnigmaContractAPIBuilder");
const utils = require("../common/utils");

class EthereumAPI {
  constructor(logger) {
    this._logger = logger;
    this._environment = null;
    this._url = null;
    this._enigmaContractAddress = null;
    this._api = null;
    this._verifier = null;
    this._services = null;
  }

  /**
   * check the connectivity to the Ethereum node
   * @param {JSON} config
   *  {ethereumAddress - wallet address,
   *   enigmaContractAddress - the contract address
   *   ethereumUrlProvider - the network url
   *  }
   * */
  async init(config) {
    let builder = new EnigmaContractAPIBuilder(this._logger);
    let res = await builder.setConfigAndBuild(config);

    this._api = res.api;
    this._environment = res.environment;
    this._url = res.url;
    this._enigmaContractAddress = res.enigmaContractAddress;

    this._services = new EthereumServices(this._api);
    this._services.initServices(null);

    this._verifier = new EthereumVerifier(this._api, this._services, this._logger);
    await this._verifier.init();
  }

  async destroy() {
    await this._environment.destroy();
  }

  /**
   * check the connectivity to the Ethereum node
   * @return {JSON}
   *  {isConnected - a flag describing the connectivity state,
   *   blockNumber - Ethereum block number
   *   url - the network url
   *   enigmaContractAddress - the contract address
   *  }
   * */
  async healthCheck() {
    let connected = null;
    let blockNumber = null;

    try {
      blockNumber = await utils.getEthereumBlockNumber(this._api.w3());
      connected = true;
    } catch (e) {
      this._logger.debug("Error received while trying to read Ethereum block number: " + e);
      connected = false;
    }

    return {
      isConnected: connected,
      blockNumber: blockNumber,
      url: this._url,
      enigmaContractAddress: this._enigmaContractAddress
    };
  }

  api() {
    return this._api;
  }

  verifier() {
    return this._verifier;
  }

  services() {
    return this._services;
  }
}

module.exports = EthereumAPI;
