const constants = require("../../../../common/constants");
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
class HandshakeUpdateAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    const recieverPeerInfo = params.who;
    const connectionType = params.connectionType;
    const status = params.status;
    let type = STAT_TYPES.HANDSHAKE_SUCCESS;
    if (status !== STATUS["OK"]) {
      type = STAT_TYPES.HANDSHAKE_FAILURE;
    }
    this._controller
      .stats()
      .addStat(type, recieverPeerInfo.id.toB58String(), {
        peerInfo: recieverPeerInfo,
        connectionType: connectionType
      });
  }
}
module.exports = HandshakeUpdateAction;
