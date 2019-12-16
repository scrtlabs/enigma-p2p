const constants = require("../../../../common/constants");

class GetPeersAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    const callback = params.callback;
    let length = 0;
    let error = null;
    try {
      length = this._controller.engNode().getConnectedPeers().length;
    } catch (err) {
      error = err;
    }
    callback(error, length);
    //this._controller.execCmd(constants.NODE_NOTIFICATIONS.GET_PEERS, {
    //  callback: callback(error, length),
    //});
  }
}
module.exports = GetPeersAction;
