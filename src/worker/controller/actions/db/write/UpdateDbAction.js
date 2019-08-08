/**
 * This action is responsible for writting to the db of core.
 * not directly of course.
 * this will write:
 * - new contract bytecode
 * - new deltas to an existing contract.
 * */
const constants = require('../../../../../common/constants');

class UpdateDbAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const msgRes = params.data;
    const onFinish = params.callback;
    this._controller.execCmd(
          constants.NODE_NOTIFICATIONS.DB_REQUEST,
        {
          input: msgRes,
          dbQueryType: constants.CORE_REQUESTS.UpdateDb,
          onResponse: (err, result)=>{
            let error = err;
            if (!error) {
              if (result.status !== constants.CORE_RESPONSE_STATUS_CODES.OK) {
                if (result.errors) {
                  error = result.errors;
                }
                else {
                  error = result.status;
                }
              }
            }
            onFinish(error, result);
          },
        }
    );
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej)=>{
      if (!params) params = {};
      params.callback = function(err, result) {
        if (err) rej(err);
        else res(result);
      };
      action.execute(params);
    });
  }
}
module.exports = UpdateDbAction;
