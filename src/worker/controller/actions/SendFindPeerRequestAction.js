class SendFindPeerRequestAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    const peerInfo = params.peerInfo;
    const onResponse = params.onResponse;
    const maxPeers = params.maxPeers;
    this._controller.connectionManager().findPeersRequest(peerInfo,
        (err, request, response) => {
          onResponse(err, request, response);
        }
        , maxPeers);
  }
}
module.exports = SendFindPeerRequestAction;
