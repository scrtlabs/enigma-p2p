const Messages = require('../policy/messages');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const constants = require('./constants');
var randomize = require('randomatic');
const defaultsDeep = require('@nodeutils/defaults-deep');

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
/**Map a connection stream to a HeartBeat response Message
 * @param {Buffer} data, stream data
 * @returns {HeartBeatResMsg} hb response
 * */
module.exports.toHeartBeatResMsg = function(data){
    let hb = data.toString('utf8').replace('\n', '');
    return new Messages.HeartBeatResMsg(hb);
};
/**Map a connection stream to a HeartBeat request Message
 * @param {Buffer} data, stream data
 * @returns {HeartBeatReqMsg} hb request
 * */
module.exports.toHeartBeatReqMsg = function(data){
    let hb = data.toString('utf8').replace('\n', '');
    return new Messages.HeartBeatReqMsg(hb);
};

/** Extract the peer id B58 from a multiaddr (bootstrapNodes)
 * @param {String} url
 * @returns {String} id, base 58
 * */
module.exports.extractId = function(url){
    return url.substring(url.length - 46,url.length);
};

module.exports.isString = function(x) {
    return Object.prototype.toString.call(x) === "[object String]"
};

module.exports.isFunction = function(functionToCheck) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}
/** update the delta patch to a json object from a smaller json
 * @param {Json} main
 * @param {Json} patch
 * @returns {Json} updated, the result with the patch
 * */
module.exports.applyDelta= function(main,patch){
    let updated = defaultsDeep(patch, main);
    return updated;
};

/** Turn a 1 level distionary to a list */
module.exports.dictToList = function(dictionary){
    let list = [];
    for(let key in dictionary){
        list.push(dictionary[key]);
    }
    return list;
};

