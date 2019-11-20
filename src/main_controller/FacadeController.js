const MainController = require("./MainController");
const constants = require("../common/constants");
const runtimesTypes = constants.RUNTIME_TYPE;

/**
 * Exposes a concrete API to all the components
 * Should be instantiated instead of MainController (general implementation)
 * This exposes an API that a CLI can interface with, for example.
 * TODO:: implement concrete methods
 * TODO:: for now can use getNode(), getIpcClient() etc...
 * */
class FacadeController extends MainController {
  constructor(runtimes) {
    super(runtimes);
    this._runtimesMap = {};
    try {
      runtimes.forEach(rt => {
        this._runtimesMap[rt.type()] = rt;
      });
    } catch (e) {
      throw new Error("Runtime does not implement type()");
    }
  }

  getNode() {
    return this._runtimesMap[runtimesTypes.Node];
  }

  getIpcClient() {
    return this._runtimesMap[runtimesTypes.Core];
  }

  getJsonRpcServer() {
    return this._runtimesMap[runtimesTypes.JsonRpc];
  }

  async shutdownSystem() {
    if (this.getJsonRpcServer()) {
      this.getJsonRpcServer().close();
    }
    this.getIpcClient().disconnect();
    await this.getNode().stop();
  }

  /**
   * @returns {JSON} result }
   * */
  async healthCheck() {
    let healthCheckResult = {
      status: false,
      core: {
        status: false,
        uri: null,
        registrationParams: {
          signKey: null
        }
      },
      ethereum: {
        status: false,
        uri: null,
        contract_addr: null
      }
      // TODO: consider adding to a periodic once there
      /*state: {
        status: false,
        missing: null
      }*/
    };

    // core
    try {
      healthCheckResult.core.uri = this.getIpcClient().getUri();
      let regParams = await this.getNode().asyncGetRegistrationParams();
      healthCheckResult.core.registrationParams.signKey = regParams.result.signingKey;
      healthCheckResult.core.status =
        healthCheckResult.core.uri != null && healthCheckResult.core.registrationParams.signKey != null;
    } catch (e) {
      healthCheckResult.core.status = false;
    }

    // ethereum
    if (this.getNode().hasEthereum()) {
      try {
        let eth = await this.getNode()
          .ethereum()
          .healthCheck();
        healthCheckResult.ethereum.uri = eth.url;
        healthCheckResult.ethereum.contract_addr = eth.enigmaContractAddress;
        healthCheckResult.ethereum.status = eth.isConnected;
      } catch (e) {
        healthCheckResult.ethereum.status = false;
      }
    }

    // sync
    /*try {
      let missingStates = await this.getNode().asyncIdentifyMissingStates();
      healthCheckResult.state.missing = missingStates["missingStatesMap"];
      if (healthCheckResult.state.missing && Object.keys(healthCheckResult.state.missing).length === 0) {
        healthCheckResult.state.status = true;
      }
    } catch (e) {
      healthCheckResult.state.status = false;
    }*/

    // overall_status
    healthCheckResult.status = healthCheckResult.core.status && healthCheckResult.ethereum.status;
    //healthCheckResult.state.status;
    return healthCheckResult;
  }
}

module.exports = FacadeController;
