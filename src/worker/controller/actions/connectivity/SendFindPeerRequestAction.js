const constants = require('../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;

class SendFindPeerRequestAction{

  constructor(controller){
    this._controller = controller;
  }

  execute(params){
    let peerInfo = params.peerInfo;
    let onResponse = params.onResponse;
    let maxPeers = params.maxPeers;
    this._controller.connectionManager().findPeersRequest(peerInfo,
      (err,request, response) => {
        onResponse(err,request,response);
      }
    , maxPeers);
  }

}
module.exports = SendFindPeerRequestAction;
