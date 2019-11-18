class BootstrapDiscoveredAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    params = params.params;
    const otherPeer = params.peer;

    // Connect to a bootstrap only if there are no active connections
    if (this._controller.engNode().arePeersConnected()) {
      return;
    }
    this._controller.engNode().connectToBootstrap(otherPeer);
  }
}
module.exports = BootstrapDiscoveredAction;