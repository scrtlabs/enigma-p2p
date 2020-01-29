class BootstrapDiscoveredAction {
  constructor(controller) {
    this._controller = controller;
  }

  async execute(params) {
    params = params.params;
    const otherPeer = params.peer;

    // Connect to a bootstrap only if there are no active connections
    if (this._controller.engNode().arePeersConnected()) {
      return;
    }

    this._controller.logger().info(`trying to connect to discovered bootstrap ${otherPeer.id.toB58String()}`);
    const success = await this._controller.engNode().connectToBootstrap(otherPeer);
    this._controller.logger().info(`connection to bootstrap succeeded=${success}`);
  }
}
module.exports = BootstrapDiscoveredAction;
