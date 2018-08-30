const Messages = require('../policy/messages');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const constants = require('./constants');
var randomize = require('randomatic');

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

/**Generate a random id out of Aa0 in len 12
 * for the JSONRPC id parameter.
 * @returns {String} random
 * */
module.exports.randId = function(){
    return randomize('Aa0',12);
}

/**Map a connection stream to a Ping Message
 * @param {Buffer} data, stream data
 * @returns {PingMsg} ping
 * */
module.exports.toPingMsg = function(data){
    let ping = data.toString('utf8').replace('\n', '');;
    ping = JSON.parse(ping);
    return new Messages.PingMsg(ping);
};

/**Map a connection stream to a Pong Message
 * @param {Buffer} data, stream data
 * @returns {PongMsg} pong
 * */
module.exports.toPongMsg = function(data){
    let pong = data.toString('utf8').replace('\n', '');
    return new Messages.PongMsg(pong);
};
module.exports.toHeartBeatResMsg = function(data){
    let hb = data.toString('utf8').replace('\n', '');
    return new Messages.HeartBeatResMsg(hb);
}

module.exports.isString = function(x) {
    return Object.prototype.toString.call(x) === "[object String]"
};