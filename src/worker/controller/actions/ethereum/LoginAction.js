const constants = require("../../../../common/constants");

class LoginAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResult = params.onResponse;
    let loginSuccess = false;
    let err = null;

    try {
      await this._controller
        .ethereum()
        .api()
        .login();
      this._controller.logger().info(`[LOGIN] successful login`);
      loginSuccess = true;
    } catch (e) {
      this._controller.logger().error(`[LOGIN] error in login error=  ${e}`);
      err = e;
    }
    if (onResult) {
      onResult(err, loginSuccess);
    }
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej) => {
      if (!params) params = {};
      params.onResponse = function(err, verificationResult) {
        if (err) rej(err);
        else res(verificationResult);
      };
      action.execute(params);
    });
  }
}
module.exports = LoginAction;
