
const constants = require('../../../../../common/constants');

/**
 * Get all addresses either from core or from cache
 * params:
 * - useCache : boolean
 * - onResponse : (err,result)=>{}
 * */
class GetAllAddrsAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let useCache = params.cache;
    let onResponse = params.onResponse;
    if(useCache){
      this._controller.cache().getAllTips((err,tipsList)=>{
        //TODO:: implement cache logic
        //TODO:: if cache empty still query core since maybe it was deleted or first time
      });
    }else {
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
        dbQueryType : constants.CORE_REQUESTS.GetAllAddrs,
        onResponse : (err,result)=>{onResponse(err,result);}
      });
    }
  }
}
module.exports = GetAllAddrsAction;




