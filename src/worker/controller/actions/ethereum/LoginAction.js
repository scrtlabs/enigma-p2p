const constants = require("../../../../common/constants");

class LoginAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResult = params.onResponse;
    let loginSuccess = false;
    let err = null;
    const api = this._controller.ethereum().api();
    try {
      const { status } = await api.getWorker(api.getWorkerAddress());
      if (status === constants.ETHEREUM_WORKER_STATUS.LOGGEDIN) {
        this._controller.logger().info(`[LOGIN] already logged in`);
      } else if (status === constants.ETHEREUM_WORKER_STATUS.UNREGISTERED) {
        this._controller.logger().error(`[LOGIN] cannot login, the worker is not registered`);
      } else {
        await api.login();
        this._controller.logger().info(`[LOGIN] successful login`);
      }
      loginSuccess = true;
    } catch (e) {
      this._controller.logger().error(`[LOGIN] error in login =  ${e}`);
      err = e;
    }
    if (onResult) {
      onResult(err, loginSuccess);
    }
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
module.exports = LoginAction;
