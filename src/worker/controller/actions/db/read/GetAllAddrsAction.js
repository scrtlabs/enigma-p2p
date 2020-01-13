const constants = require("../../../../../common/constants");

/**
 * Get all addresses either from core
 * params:
 * - onResponse : (err,result)=>{}
 * */
class GetAllAddrsAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const onResponse = params.onResponse;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
      dbQueryType: constants.CORE_REQUESTS.GetAllAddrs,
      onResponse: (err, result) => {
        onResponse(err, result);
      }
    });
  }
}
module.exports = GetAllAddrsAction;
