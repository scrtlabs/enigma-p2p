const nodeUtils = require('../../common/utils');
const pickRandom = require('pick-random');
// const PeerInfo = require('peer-info');

class PeerBank {
  constructor() {
    this._peerBank = {};
    this._markedPeers = {};
  }
  getPeerBankList() {
    return nodeUtils.dictToList(this._peerBank);
  }
  addPeer(peer) {
    const peerId = peer.peerId.id;
    let final = peer;

    if (this.inBank(peerId)) {
      const main = this._peerBank[peerId];
      const patch = peer;
      final = nodeUtils.applyDelta(main, patch);
    }
    this._peerBank[peerId] = final;
  }
  /**
   * @param {Array<PeerInfo>} peers
   */
  addPeers(peers) {
    throw Error('addPeers is deprecated, use addPeersNoActive instead.');
    // peers.forEach(p=>{
    //     this.addPeer(p);
    // });
  }
  /**
   * This add peers BUT with removal of active connections meaning,
   * if A-> B and A->C, when  C->B then B will send A and we dont want it since we already connected to it.
   * @param {Array<PeerInfo>} peers
   * @param {Array<String>} activeConnections , b58 ids
   */
  addPeersNoActive(peers, activeConnections) {
    const filterd = peers.filter((p) => !activeConnections.includes(p.peerId.id));
    filterd.forEach((p)=>{
      this.addPeer(p);
    });
  }
  removePeer(peerId) {
    delete this._peerBank[peerId];
  }
  inBank(peerId) {
    return (peerId in this._peerBank);
  }
  /** get a random amount of potential peers from the peer bank.
   * if num > current peer bank size then num = peer_bank_size-1
   * @param {Integer} num, number of peers to select from the bank.
   * @return {Null/Array}, null if final num =0 list of selected peers otherwise.
   */
  getRandomPeers(num) {
    const list = nodeUtils.dictToList(this._peerBank);
    if (num<0) {
      return [];
    } else if (num >= list.length ) {
      return list;
    } else {
      return pickRandom(list, {count: num});
    }
  };
  /**
   * Mark peers as searched previously - used for not repeating
   * @param {String} peerId, Base 58
   */
  markPeer(peerId) {
    const marked = this._peerBank[peerId];
    if (marked) {
      this.removePeer(peerId);
      this._markedPeers[peerId] = marked;
    }
  }
  /** Mark list of peers
   * @param {Array} peersId, list of b58 id's
   */
  markPeers(peersId) {
    peersId.forEach((pid)=>{
      this.markPeer(pid);
    });
  }
  /** get all the peer bank dict
   * @return {Json} peerBank
   */
  getAllPeerBank() {
    return this._peerBank;
  }
}

module.exports = PeerBank;


// let list = [
//     {
//         "peerId":{
//             "id":"Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP"
//         },
//         "connectedMultiaddr":"/ip4/0.0.0.0/tcp/10334/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP",
//         "multiAddrs":[
//             "/ip4/0.0.0.0/tcp/10334/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP"
//         ]
//     },
//     {
//         "peerId":{
//             "id":"QmRMpQ8w3bjFvKu9NfGxNwbUcjiPATZ8tTJ7sAGQqDEvaV",
//             "pubKey":"CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCKxkPLSCieOMw0dSMMqXxqfQVCRiMaD/jlsyrR9Y"+
//                      "/CN0+uJ2hOOv9s5uVbfWf5h1WxyMBJ4GijAY5FPAOFG53GNksOWVgrd3EUKOZDRoOtJXssXFOTlRhDzRh8B91CQzxy"+
//                      "o9AMFcz4pU3FRftc8+c2Zhpxzm8xZ7YUh0yKSMAiSwwFGXR/2LWhaVC/+WcBWVY12+NpHEKuhDvmD1/j4g7wnZ4Qvs"+
//                      "rHE2NcO0opgdI3zBJLFSe38NQS8dQxxLuwASYoZN8h4odJvmusVOuHRvkMoRiLWk3tF7yfZYZMSjOpFpfK4dNWCBNr"+
//                      "1mVKhBGDJQZXq1wmBVUXThen+aYDDHnlAgMBAAE="
//         },
//         "connectedMultiaddr":"/ip4/127.0.0.1/tcp/44939/ipfs/QmRMpQ8w3bjFvKu9NfGxNwbUcjiPATZ8tTJ7sAGQqDEvaV",
//         "multiAddrs":[
//             "/ip4/127.0.0.1/tcp/44939/ipfs/QmRMpQ8w3bjFvKu9NfGxNwbUcjiPATZ8tTJ7sAGQqDEvaV",
//             "/ip4/192.168.34.19/tcp/44939/ipfs/QmRMpQ8w3bjFvKu9NfGxNwbUcjiPATZ8tTJ7sAGQqDEvaV"
//         ]
//     },
//
// ]
//
// let p = new PeerBank();
// p.addPeers(list);
// let pList = p.getRandomPeers(2);
// console.log("size = > " + pList.length + " " + JSON.stringify(pList,null,2));
