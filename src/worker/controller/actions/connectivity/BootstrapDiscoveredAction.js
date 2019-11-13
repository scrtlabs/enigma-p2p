class BootstrapDiscoveredAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    params = params.params;
    const otherPeer = params.peer;

    if (this._controller.engNode().isConnected(otherPeer.id.toB58String())) {
      return;
    }
    this._controller.engNode().connectToBootstrap(otherPeer);
  }
}
module.exports = BootstrapDiscoveredAction;
