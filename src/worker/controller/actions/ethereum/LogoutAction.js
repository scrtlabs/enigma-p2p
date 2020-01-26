const constants = require("../../../../common/constants");

class LogoutAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResult = params.onResponse;
    let logoutSuccess = false;
    let err = null;

    const api = this._controller.ethereum().api();
    try {
      const workerAddress = api.getWorkerAddress();
      const { status } = await api.getWorker(workerAddress);
      if (status === constants.ETHEREUM_WORKER_STATUS.LOGGEDOUT) {
        this._controller.logger().info(`[LOGOUT] already logged out`);
      } else {
        await api.logout();
        this._controller.logger().info(`[LOGOUT] successful logout`);
      }
      logoutSuccess = true;
    } catch (e) {
      this._controller.logger().error(`[LOGOUT] error in logout error=  ${e}`);
      err = e;
    }
    if (onResult) {
      onResult(err, logoutSuccess);
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
module.exports = LogoutAction;
