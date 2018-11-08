class DoHandshakeAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    params = params.params;
    const otherPeer = params.peer;

    if (this._controller.engNode().isConnected(otherPeer.id.toB58String())) {
      return;
    }

    const withPeerList = true;
    this._controller.connectionManager().handshake(otherPeer, withPeerList);
  }
}
module.exports = DoHandshakeAction;
