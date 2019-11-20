const errors = require("../../../../common/errors");
/**
 * Find content providers to provide data
 * Takes list of hashes -> turns them into cid's
 * calls next(result)
 * */
class GetLocalTipsOfRemote {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    let peerB58Id = params.peerB58Id;
    if (!peerB58Id) {
      return null;
    }
    try {
      let peerInfo = await this._controller.engNode().lookUpPeer(peerB58Id);
      if (!peerInfo) {
        throw new errors.P2PErr(`no such peer ${b58Id}`);
      }
      let remoteTips = await this._controller
        .engNode()
        .getLocalStateOfRemote(peerInfo);
      return remoteTips;
    } catch (e) {
      this._controller.logger().error(`GetLocalTipsOfRemote Action ${e}`);
      return null;
    }
  }
}
module.exports = GetLocalTipsOfRemote;
