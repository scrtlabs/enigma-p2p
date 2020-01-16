const constants = require("../../../../common/constants");

class UnregisterAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResult = params.onResponse;
    let success = false;
    let err = null;

    const api = this._controller.ethereum().api();

    try {
      const workerAddress = api.getWorkerAddress();
      const { status } = await api.getWorker(workerAddress);
      if (status === constants.ETHEREUM_WORKER_STATUS.UNREGISTERED) {
        this._controller.logger().info(`[UNREGISTER] already unregistered`);
      } else {
        await api.unregister();
        this._controller.logger().info(`[UNREGISTER] successful unregister`);
      }

      success = true;
    } catch (e) {
      this._controller.logger().error(`[UNREGISTER] error in unregister error=  ${e}`);
      err = e;
    }
    if (onResult) {
      onResult(err, success);
    }
  }
  async asyncExecute(params) {
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
module.exports = UnregisterAction;
