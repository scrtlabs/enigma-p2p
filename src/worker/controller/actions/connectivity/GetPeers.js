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
  }
}
module.exports = GetPeersAction;
