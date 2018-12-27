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
}

module.exports = FacadeController;
