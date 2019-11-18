const constants = require('../../../../common/constants');

class NewPeerAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    params = params.params;
    const callback = params.callback;
    const autoInit = this._controller.getAutoInitParams();

    // Check if auto init is required
    if (autoInit) {
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.INIT_WORKER, {
        callback: callback,
        amount: autoInit.amount});
    }
  }
}
module.exports = NewPeerAction;
