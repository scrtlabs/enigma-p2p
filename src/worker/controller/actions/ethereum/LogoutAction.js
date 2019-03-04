const constants = require('../../../../common/constants');

class LogoutAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResult = params.onResponse;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS, {
      onResponse: async (err, regParams)=>{
        let logoutSuccess = false;
        if (err) {
          this._controller.logger().error(`[LOGOUT] error in logout error=  ${err}`);
        }
        else {
          const txParams = {from: regParams.result.signingKey};
          try {
            const txReceipt = await this._controller.ethereum().api().logout(txParams);
            this._controller.logger().info(`[LOGOUT] successful logout, receipt = ${txReceipt}`);
            logoutSuccess = true;
          } catch (e) {
            this._controller.logger().error(`[LOGOUT] error in logout error=  ${e}`);
            err = e;
          }
        }
        if (onResult) {
          onResult(err, logoutSuccess);
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
module.exports = LogoutAction;
