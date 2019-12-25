const constants = require("../../../common/constants");

class GetStatusAction {
  constructor(controller) {
    this._controller = controller;
  }

  /**
   * @param {Function} callback (err)=>{}
   * */
  async execute(params) {
    const callback = params.callback;
    const C = constants.NODE_NOTIFICATIONS;
    let status = null;
    let error = null;

    if (this._controller.isWorkerInitInProgress()) {
      status = constants.WORKER_STATUS.INITIALIZING;
    } else {
      let workerParams;

      try {
        workerParams = await this._controller.asyncExecCmd(C.GET_ETH_WORKER_PARAM);
        switch (workerParams.status) {
          case constants.ETHEREUM_WORKER_STATUS.UNREGISTERED:
            status = constants.WORKER_STATUS.UNREGISTERED;
            break;
          case constants.ETHEREUM_WORKER_STATUS.LOGGEDIN:
            status = constants.WORKER_STATUS.LOGGEDIN;
            break;
          case constants.ETHEREUM_WORKER_STATUS.LOGGEDOUT:
            status = constants.WORKER_STATUS.REGISTERED;
            break;
        }
      } catch (err) {
        this._controller.logger().warning("reading worker params from ethereum failed: " + err);
        error = err;
      }
    }
    callback(error, status);
  }

  async asyncExecute(params) {
    const action = this;
    return new Promise((resolve, reject) => {
      params.callback = function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      };
      action.execute(params);
    });
  }
}

module.exports = GetStatusAction;
