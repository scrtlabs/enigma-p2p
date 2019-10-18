const constants = require('../../../../common/constants');

class LogoutAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResult = params.onResponse;
    let logoutSuccess = false;
    let err = null;

    try {
      await this._controller.ethereum().api().logout();
      this._controller.logger().info(`[LOGOUT] successful logout`);
      logoutSuccess = true;
    } catch (e) {
      this._controller.logger().error(`[LOGOUT] error in logout error=  ${e}`);
      err = e;
    }
    if (onResult) {
      onResult(err, logoutSuccess);
    }
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej)=>{
      if (!params) params = {};
      params.onResponse = function(err, verificationResult) {
        if (err) rej(err);
        else res(verificationResult);
      };
      action.execute(params);
    });
  }
}
module.exports = LogoutAction;
