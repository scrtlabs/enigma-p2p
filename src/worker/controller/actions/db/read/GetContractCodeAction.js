const constants = require('../../../../../common/constants');
/**
 This action returns all the requested deltas.
 either from cache or directly from core.
 * */
class GetContractCodeAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let onResult = params.onResponse;
    let queryMsg = params.requestMsg;
    // make query
    let addr = queryMsg.contractAddress();
    let input = [addr];
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
      dbQueryType : constants.CORE_REQUESTS.GetContract,
      input : input,
      onResponse : (err,result)=>{return onResult(err,result);}
    });
  }
}
module.exports = GetContractCodeAction;

