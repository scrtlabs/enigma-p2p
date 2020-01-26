const constants = require("../../../../common/constants");

class RegisterAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResult = params.onResponse;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS, {
      onResponse: async (err, regParams) => {
        let success = false;
        if (err) {
          this._controller.logger().error(`[REGISTER] error=  ${err}`);
        } else {
          const signerAddress = regParams.result.signingKey;
          const report = regParams.result.report;
          const signature = regParams.result.signature;
          try {
            await this._controller
              .ethereum()
              .api()
              .register(signerAddress, report, signature);
            this._controller.logger().info("[REGISTER] successful registration");
            success = true;
          } catch (e) {
            this._controller.logger().error(`[REGISTER] error=  ${e}`);
            err = e;
          }
        }
        if (onResult) {
          onResult(err, success);
        }
      }
    });
  }
  asyncExecute(params) {
    const action = this;
    return new Promise((res, rej) => {
      if (!params) params = {};
      params.onResponse = function(err, result) {
        if (err) rej(err);
        else res(result);
      };
      action.execute(params);
    });
  }
}
module.exports = RegisterAction;
