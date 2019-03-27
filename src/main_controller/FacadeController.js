const MainController = require('./MainController');
const constants = require('../common/constants');
const runtimesTypes = constants.RUNTIME_TYPE;

/**
 * Exposes a concrete API to all the components
 * Should be instantiated instead of MainController (general implementation)
 * This exposes an API that a CLI can interface with, for example.
 * TODO:: implement concrete methods
 * TODO:: for now can use getNode(), getIpcClient() etc...
 * */
class FacadeController extends MainController{
  constructor(runtimes){
    super(runtimes);
    this._runtimesMap = {};
    try{
      runtimes.forEach(rt=>{
        this._runtimesMap[rt.type()] = rt;
      });
    }catch(e){
      throw new Error("Runtime does not implement type()");
    }
  }
  getNode(){
    return this._runtimesMap[runtimesTypes.Node];
  }
  getIpcClient(){
    return this._runtimesMap[runtimesTypes.Core];
  }
  getJsonRpcServer(){
    return this._runtimesMap[runtimesTypes.JsonRpc];
  }
  async shutdownSystem(){
    if(this.getJsonRpcServer()){
      this.getJsonRpcServer().close();
    }
    this.getIpcClient().disconnect();
    await this.getNode().stop();
  }
  /**
   * connectivity:
   * checks if > criticlal DHT and if < max outbound
   * @returns {Json} result {status : bool, connection : {status : bool, outbound : number, inbound : number}}
   * */
  async healthCheck(){
    let healthCheckResult = {
      status : false,
      connection : {
        status : false,
        inbound : -1,
        outbound : -1,
      },
      core : {
        status : false,
        uri : null,
        registrationParams: {
          signKey : null,
        }
      },
      ethereum: {
        status: false,
        uri: null,
        contract_addr: null,
      },
      state: {
        status: false,
        missing: null,
      }
    };
    // connectivity
    healthCheckResult.connection.inbound = this.getNode().getAllInboundHandshakes().length;
    healthCheckResult.connection.outbound = this.getNode().getAllOutboundHandshakes().length;
    healthCheckResult.connection.status = constants.DHT_STATUS.CRITICAL_LOW_DHT_SIZE < healthCheckResult.connection.outbound &&
      healthCheckResult.connection.outbound <= constants.DHT_STATUS.CRITICAL_HIGH_DHT_SIZE &&
      healthCheckResult.connection.inbound < constants.DHT_STATUS.MAX_OUTBOUND;

    // core
    healthCheckResult.core.uri = this.getIpcClient().getUri();
    let regParams = await this.getNode().asyncGetRegistrationParams();
    healthCheckResult.core.registrationParams.signKey = regParams.result.signingKey;
    healthCheckResult.core.status = healthCheckResult.core.uri != null && healthCheckResult.core.registrationParams.signKey != null;

    // ethereum
    let eth = await this.getNode().ethereum().healthCheck();
    healthCheckResult.ethereum.uri = eth.url;
    healthCheckResult.ethereum.contract_addr = eth.enigmaContractAddress;
    healthCheckResult.ethereum.status = eth.isConnected;

    // sync
    let missingStates = await this.getNode().asyncIdentifyMissingStates();
    healthCheckResult.state.missing = missingStates["missingStatesMap"];
    if(healthCheckResult &&
      healthCheckResult.state &&
      healthCheckResult.state.missing &&
      Object.keys(healthCheckResult.state.missing).length === 0) {
        healthCheckResult.state.status = true;
    }
    // overall_status
    healthCheckResult.status = healthCheckResult.connection.status &&
      healthCheckResult.core.status &&
      healthCheckResult.ethereum.status && healthCheckResult.state.status;
    return healthCheckResult;
  }
}

module.exports = FacadeController;
