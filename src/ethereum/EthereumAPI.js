const EthereumServices = require('./EthereumServices');
const EthereumVerifier = require('./EthereumVerifier');
const EnigmaContractAPIBuilder = require('./EnigmaContractAPIBuilder');
const EnigmaContractMock = require('./EnigmaContractMock');

class EthereumAPI {

  constructor(logger) {
    this._logger = logger;
    this._api = null;
    this._verifier = null;
    this._services = null;
  }

  async init(enigmaContractAddress, url) {
    let builder = new EnigmaContractAPIBuilder(this._logger);
    let res = await builder.setConfigAndBuild(enigmaContractAddress, url);

    this._api = res.api;
    this._environment = res.environment;

    this._services = new EthereumServices(this._api);
    this._services.initServices();

    this._verifier = new EthereumVerifier(this._api, this._services, this._logger);
    await this._verifier.init();
  }

  async destroy() {
    await this._environment.destroy();
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

class EthereumAPIMock extends EthereumAPI {

  constructor(logger) {
    super(logger);
    this._api = new EnigmaContractMock();
    this._services = new EthereumServices(this._api);
    this._verifier = new EthereumVerifier(this._api, this._services);
  }

  async init() {
    this._services.initServices();
    await this._verifier.init();
  }
}

module.exports.EthereumAPI = EthereumAPI;
module.exports.EthereumAPIMock = EthereumAPIMock;
