const constants = require("../../../../../common/constants");

/**
 This action returns tips for the requested secret contracts array from core.
 * */
class GetTipsAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const contractAddresses = params.contractAddresses;
    const onResult = params.onResponse;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
      dbQueryType: constants.CORE_REQUESTS.GetTips,
      input: [contractAddresses],
      onResponse: (err, result) => {
        let tips = [];
        if (result && result.result && result.result.tips) {
          tips = result.result.tips;
        }
        return onResult(err, tips);
      }
    });
  }
  asyncExecute(params) {
    const action = this;
    return new Promise((res, rej) => {
      params.onResponse = function(err, tips) {
        if (err) rej(err);
        else res(tips);
      };
      action.execute(params);
    });
  }
}
module.exports = GetTipsAction;
