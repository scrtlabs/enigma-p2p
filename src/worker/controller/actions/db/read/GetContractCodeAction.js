const constants = require('../../../../../common/constants');
/**
 This action returns all the requested deltas.
 either from cache or directly from core.
 * */
class GetContractCodeAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const onResult = params.onResponse;
    const queryMsg = params.requestMsg;
    // make query
    const addr = queryMsg.contractAddress();
    const input = addr;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, {
      dbQueryType: constants.CORE_REQUESTS.GetContract,
      input: input,
      onResponse: (err, result)=>{
        return onResult(err, result);
      },
    });
  }
}
module.exports = GetContractCodeAction;

