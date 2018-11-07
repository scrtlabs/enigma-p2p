const constants = require('../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;

class DoHandshakeAction{

    constructor(controller){
        this._controller = controller;
    }

    execute(params){
        params = params.params;
        let otherPeer = params.peer;

        if(this._controller.engNode().isConnected(otherPeer.id.toB58String())){
            return;
        }

        let withPeerList = true;
        this._controller.connectionManager().handshake(otherPeer, withPeerList);

    }
}
module.exports = DoHandshakeAction;
