const Messages = require('../policy/p2p_messages/messages');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const randomize = require('randomatic');
const defaultsDeep = require('@nodeutils/defaults-deep');
const pickRandom = require('pick-random');
const mafmt = require('mafmt');
const multiaddr = require('multiaddr');
const timestamp = require('unix-timestamp');


/**
 * Simply sleep
 * @param {Integer} ms - milliseconds
 * @example `await sleep(1000)` will sleep for a second and block.
 * */
module.exports.sleep = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/** turn peerbook into parsed obj
 * @param {peerInfo} rawPeerBook
 * @return {Array}
 */
module.exports.parsePeerBook = function(rawPeerBook) {
  if (rawPeerBook == undefined || rawPeerBook == null) {
    return null;
  }
  const parsed = [];
  rawPeerBook.forEach((rp)=>{
    const pp = _parsePeerInfo(rp);
    if (pp != null) {
      parsed.push(pp);
    }
  });
  return parsed;
};
/** turn the libp2p peer-info into a parsed obj
 * @params {PeerInfo} , rawPeerInfo libp2p
 * @returns {peerId, connectedMultiaddr,multiAddrs}
 * */

module.exports.parsePeerInfo = function(rawPeerInfo) {
  return _parsePeerInfo(rawPeerInfo);
};

function _parsePeerInfo(rawPeerInfo) {
  if (rawPeerInfo == undefined || rawPeerInfo == null) {
    return null;
  }

  const multiAddrs = [];
  rawPeerInfo.multiaddrs.forEach((ma)=>{
    multiAddrs.push(ma.toString());
  });
  const parsedPeerInfo = {peerId: rawPeerInfo.id.toJSON(),
    connectedMultiaddr: rawPeerInfo._connectedMultiaddr.toString(),
    multiAddrs: multiAddrs};
  return parsedPeerInfo;
};

/** Generate a random id out of Aa0 in len 12
 * for the JSONRPC id parameter.
 * @return {String} random
 * */
module.exports.randId = function() {
  return randomize('Aa0', 12);
};

/** Map a connection stream to a Ping Message
 * @param {Buffer} data, stream data
 * @return {PingMsg} ping
 * */
module.exports.toPingMsg = function(data) {
  let ping = data.toString('utf8').replace('\n', '');
  ping = JSON.parse(ping);
  return new Messages.PingMsg(ping);
};

/** Map a connection stream to a Pong Message
 * @param {Buffer} data, stream data
 * @return {PongMsg} pong
 * */
module.exports.toPongMsg = function(data) {
  const pong = data.toString('utf8').replace('\n', '');
  return new Messages.PongMsg(pong);
};
/** Map a connection stream to a HeartBeat response Message
 * @param {Buffer} data, stream data
 * @return {HeartBeatResMsg} hb response
 * */
module.exports.toHeartBeatResMsg = function(data) {
  const hb = data.toString('utf8').replace('\n', '');
  return new Messages.HeartBeatResMsg(hb);
};
/** Map a connection stream to a HeartBeat request Message
 * @param {Buffer} data, stream data
 * @return {HeartBeatReqMsg} hb request
 * */
module.exports.toHeartBeatReqMsg = function(data) {
  const hb = data.toString('utf8').replace('\n', '');
  return new Messages.HeartBeatReqMsg(hb);
};

/** Map a connection stream to a findpeers request msg
 * @param {Buffer} data ,
 * @return {HeartBeatReqMsg}*/
module.exports.toFindPeersReqMsg = function(data) {
  const fp = data.toString('utf8').replace('\n', '');
  return new Messages.FindPeersReqMsg(fp);
};


/** Map a connection stream to a findpeers response msg
 * @param {Buffer} data ,
 * @return {FindPeersResMsg}*/
module.exports.toFindPeersResMsg = function(data) {
  const fp = data.toString('utf8').replace('\n', '');
  return new Messages.FindPeersResMsg(fp);
};

/** Extract the peer id B58 from a multiaddr (bootstrapNodes)
 * @param {String} url
 * @return {String} id, base 58
 * */
module.exports.extractId = function(url) {
  if (!_isIpfs(url)) {
    return null;
  } else {
    return url.substring(url.length - 46, url.length);
  }
};

module.exports.isString = function(x) {
  return Object.prototype.toString.call(x) === '[object String]';
};

module.exports.isFunction = function(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
};
/** update the delta patch to a json object from a smaller json
 * @param {Json} main
 * @param {Json} patch
 * @return {Json} updated, the result with the patch
 * */
module.exports.applyDelta= function(main, patch) {
  const updated = defaultsDeep(patch, main);
  return updated;
};

/** get current timestamp in unix format
 * @return {number} now e.g 1537191762.112
 */
module.exports.unixTimestamp = function() {
  return timestamp.now();
};
/** Turn a 1 level distionary to a list
 * @param {dictionary} dictionary
 * @return {Array}
 */
module.exports.dictToList = function(dictionary) {
  const list = [];
  Object.keys(dictionary).forEach(function(key) {
    list.push(dictionary[key]);
  });
  return list;
};


/** pick a random number of elements from a list
 * @param {Array} list - list of elements to chose from
 * @param {Integer} num - if num =0 || num> list size return all list
 * @return {Array}
 */
module.exports.pickRandomFromList = function(list, num) {
  if (num <=0 || num >= list.length) {
    return list;
  }
  return pickRandom(list, {count: num});
};

/** check if a connection string is an IPFS address
 * @param {String} addr, /ip4/0.0.0.0/tcp/10333/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm
 * @return {Boolean} bool, true if isIpfs false otherwise.
 * */
module.exports.isIpfs = function(addr) {
  return _isIpfs(addr);
};

/** turn a seed from the peer bank into PeerInfo class*
 * @param {Json} seed https://paste.ubuntu.com/p/YMq9dvHkkS/
 * @param {Function} callback , (err,peerInfo)=>{}
 */

module.exports.peerBankSeedtoPeerInfo = function(seed, callback) {
  if (PeerInfo.isPeerInfo(seed)) {
    callback(null, seed);
  } else {
    PeerInfo.create(seed.peerId, (err, peerInfo)=>{
      if (err) {
        callback(err, null);
      }

      if (seed.multiAddrs) {
        seed.multiAddrs.forEach((ma)=>{
          if (_isIpfs(ma)) {
            peerInfo.multiaddrs.add(ma);
          }
        });
      }
      callback(err, peerInfo);
    });
  }
};

/**
 * Connection string to PeerInfo
 * @param {String} addr,/ip4/0.0.0.0/tcp/10333/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm
 * @param {Function} onResult , (err,PeerInfo)=>{}
 * */
module.exports.connectionStrToPeerInfo = function(addr, onResult) {
  _connectionStrToPeerInfo(addr, onResult);
};


function _isIpfs(addr) {
  try {
    return mafmt.IPFS.matches(addr);
  } catch (e) {
    return false;
  }
};


function _connectionStrToPeerInfo(candidate, onResult) {
  if (!_isIpfs(candidate)) {
    onResult(new Error('Invalid multiaddr'), null);
  }

  const ma = multiaddr(candidate);

  const peerId = PeerId.createFromB58String(ma.getPeerId());

  PeerInfo.create(peerId, (err, peerInfo) => {
    if (err) {
      onResult(err, null);
    } else {
      peerInfo.multiaddrs.add(ma);
      onResult(err, peerInfo);
    }
  });
};
