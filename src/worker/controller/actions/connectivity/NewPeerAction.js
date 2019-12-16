const constants = require("../../../../common/constants");

class NewPeerAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    params = params.params;
    const callback = params.callback;
    const autoInit = this._controller.isAutoInit();
    const initRequired = this._controller.canInitWorker();

    // Check if auto init is set and initialization has not done yet
    if (autoInit && initRequired) {
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.INIT_WORKER, {
        callback: callback
      });
    }
  }
}
module.exports = NewPeerAction;
