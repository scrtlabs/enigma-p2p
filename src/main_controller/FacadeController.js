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
    console.log("1111111111111111 ----------->>>>>>>> shutting down!!!!!!!!!!!!!!!!!!!!1")
    this.getIpcClient().disconnect();
    console.log("222222222222222 1111111111111111 ----------->>>>>>>> shutting down!!!!!!!!!!!!!!!!!!!!1")
    await this.getNode().stop();
    console.log("33333333333333333333 1111111111111111 ----------->>>>>>>> shutting down!!!!!!!!!!!!!!!!!!!!1")
  }
  /**
   * connectivity:
   * checks if > criticlal DHT and if < max outbound
   * @returns {Json} result {status : bool, connection : {status : bool, outbound : number, inbound : number}}
   * */
  healthcheck(){
    // user constants.js
    // getNode() : NodeController
    //
    // return {
    //   status : true,
    //   connection : {
    //     status : true,
    //     inbound : 13,
    //     outbound : 8,
    //   }
    // }
  }
}

module.exports = FacadeController;
