const constants = require('../../../../../common/constants');

/**
 This action returns tips for the requested secret contracts array
 either from cache or directly from core.
 * */
class GetTipsAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const useCache = params.cache;
    const contractAddresses = params.contractAddresses;
    const onResult = params.onResponse;
    if (useCache) {
      this._controller.cache().getTips(contractAddresses, (err, tip)=>{
        // TODO:: implement cache logic
        // TODO:: if cache empty still query core since maybe it was deleted or first time
      });
    }
    else {
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
        dbQueryType: constants.CORE_REQUESTS.GetTips,
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
module.exports = GetTipsAction;

