
const constants = require('../../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const Envelop = require('../../../../../main_controller/channels/Envelop');
/**
 This action returns all the tips
 either from cache or directly from core.
 * */
class GetAllTipsAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const useCache = params.cache;
    const onResult = params.onResponse;
    if (useCache) {
      this._controller.cache().getAllTips((err, tipsList)=>{
        // TODO:: implement cache logic
        // TODO:: if cache empty still query core since maybe it was deleted or first time
      });
    } else {
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
        dbQueryType: constants.CORE_REQUESTS.GetAllTips,
        onResponse: (err, result)=>{
          let tips;
          if (result.tips) {
            tips = result.tips;
          }
          else {
            tips = []
          }
          return onResult(err, tips);
        },
      });
    }
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej)=>{
      params.onResponse = function(err, tips) {
        if (err) rej(err);
        else res(tips);
      };
      action.execute(params);
    });
  }
}
module.exports = GetAllTipsAction;

