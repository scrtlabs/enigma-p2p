const constants = require('../../../../common/constants');

class LoginAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResult = params.onResponse;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS, {
      onResponse: async (err, regParams)=>{
        let loginSuccess = false;
        if (err) {
          this._controller.logger().error(`[LOGIN] error in login error=  ${err}`);
        }
        else {
          const txParams = {from: regParams.result.signingKey};
          try {
            const txReceipt = await this._controller.ethereum().api().login(txParams);
            this._controller.logger().info(`[LOGIN] successful login, receipt = ${txReceipt}`);
            loginSuccess = true;
          } catch (e) {
            this._controller.logger().error(`[LOGIN] error in login error=  ${e}`);
            err = e;
          }
        }
        if (onResult) {
          onResult(err, loginSuccess);
        }
      },
    });
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej)=>{
      params.onResponse = function(err, verificationResult) {
        if (err) rej(err);
        else res(verificationResult);
      };
      action.execute(params);
    });
  }
}
module.exports = LoginAction;
