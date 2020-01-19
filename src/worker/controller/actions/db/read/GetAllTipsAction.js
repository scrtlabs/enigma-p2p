const constants = require("../../../../../common/constants");

/**
 This action returns all the tips from core.
 * */
class GetAllTipsAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const onResult = params.onResponse;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
      dbQueryType: constants.CORE_REQUESTS.GetAllTips,
      onResponse: (err, result) => {
        let tips;
        if (result && result.result && result.result.tips) {
          tips = result.result.tips;
        } else {
          tips = [];
        }
        return onResult(err, tips);
      }
    });
  }
  async asyncExecute(params) {
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
module.exports = GetAllTipsAction;
