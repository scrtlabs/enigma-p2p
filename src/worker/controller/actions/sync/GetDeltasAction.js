
const constants = require('../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const Envelop = require('../../../../main_controller/channels/Envelop');
/**
 This action returns all the requested deltas.
 either from cache or directly from core.
 * */
class GetDeltasAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){

    let onResult = params.onResponse;
    let queryMsg = params.query;
    // make query
    let addr = queryMsg.contractAddress();
    let range = queryMsg.getRange();
    let from = range.fromIndex;
    let to = range.toIndex;
    let input = [{address:addr, from: from, to: to}];
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
      queryType : constants.CORE_REQUESTS.GetDeltas,
      query : input,
      onResponse : (err,result)=>{return onResult(err,result);}
    });
  }
}
module.exports = GetDeltasAction;

