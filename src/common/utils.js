const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const constants = require('./constants');


/** turn peerbook into parsed obj */
module.exports.parsePeerBook = function(rawPeerBook){
    let parsed = [];
    rawPeerBook.forEach(rp=>{
        let pp = _parsePeerInfo(rp);
        if(pp != null)
            parsed.push(pp);
    });
    return parsed;
};
/** turn the libp2p peer-info into a parsed obj
 * @params {PeerInfo} , rawPeerInfo libp2p
 * @returns {peerId, connectedMultiaddr,multiAddrs}
 * */

module.exports.parsePeerInfo = function(rawPeerInfo){
    return _parsePeerInfo(rawPeerInfo);
};

function _parsePeerInfo(rawPeerInfo){

    if (rawPeerInfo == undefined || rawPeerInfo == null)
        return null;

    let multiAddrs = [];
    rawPeerInfo.multiaddrs.forEach(ma=>{
        multiAddrs.push(ma.toString());
    });
    let parsedPeerInfo = {peerId : rawPeerInfo.id.toJSON(),
        connectedMultiaddr:rawPeerInfo._connectedMultiaddr.toString(),
        multiAddrs : multiAddrs};
    return parsedPeerInfo;
};