
const constants = require('../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const Envelop = require('../../../../main_controller/channels/Envelop');
/**
 This action returns all the tips
 either from cache or directly from core.
 * */
class GetAllTipsAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let useCache = params.cache;
    let onResult = params.onResponse;
    if(useCache){
      this._controller.cache().getAllTips((err,tipsList)=>{
        //TODO:: implement cache logic
        //TODO:: if cache empty still query core since maybe it was deleted or first time
      });
    }else{
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
        queryType : constants.CORE_REQUESTS.GetAllTips,
        onResponse : (err,result)=>{return onResult(err,result);}
      });
    }
  }
}
module.exports = GetAllTipsAction;

