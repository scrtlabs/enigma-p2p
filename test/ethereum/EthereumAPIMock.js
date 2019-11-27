const EnigmaContractMock = require("./EnigmaContractMock");
const EthereumAPI = require("../../src/ethereum/EthereumAPI");
const EthereumServices = require("../../src/ethereum/EthereumServices");
const EthereumVerifier = require("../../src/ethereum/EthereumVerifier");

class EthereumAPIMock extends EthereumAPI {
  constructor(logger) {
    super(logger);
    this._api = new EnigmaContractMock();
    this._services = new EthereumServices(this._api);
    this._verifier = new EthereumVerifier(this._api, this._services, logger);
  }

  async init() {
    this._services.initServices();
    await this._verifier.init();
  }

  async destroy() {}
}

module.exports = EthereumAPIMock;
