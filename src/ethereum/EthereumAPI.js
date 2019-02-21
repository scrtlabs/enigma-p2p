const EthereumServices = require('./EthereumServices');
const EthereumVerifier = require('./EthereumVerifier');
const EnigmaContractAPIBuilder = require('./EnigmaContractAPIBuilder');

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
    this._services.init();

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
}

module.exports = EthereumAPI;
