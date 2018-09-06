const EventEmitter = require('events').EventEmitter;
const nodeUtils = require('../../common/utils');

class State extends EventEmitter{

    constructor(bootstrapNodes){
        super();
        this._boostrapNodes = {};

        bootstrapNodes.forEach(bNode=>{
            let id = nodeUtils.extractId(bNode);
            this._boostrapNodes[id] = {
              'url' : bNode,
              'handshaked' : false
            };
        });
    }
    /**
     * */
    handshakedDiscovery(peerInfo,success,pongMsg){
        if(this._boostrapNodes[peerInfo.id.toB58String()]){

            this._boostrapNodes[peerInfo.id.toB58String()]['handshaked'] = true;
            this._boostrapNodes[peerInfo.id.toB58String()]['success'] = success;
            this._boostrapNodes[peerInfo.id.toB58String()]['pongMsg'] = pongMsg;

            this.emit('stateNewHandshakeDiscovery', {'status':success,'peerInfo' : peerInfo,'pongMsg' : pongMsg});
        }
    }
    handshakedNewNode(peerInfo,success,pongMsg){

    }

}
//
// class PeerState{
//
//     constructor(options){
//
//         this._options = options;
//         this._idB58 = null;
//         this._isHandshaked = false;
//         this._peerInfo = null;
//         this._peerId = null;
//         this._isBlackListed = false;
//         this._isBootstrapNode = false;
//         this._connectedMultiaddr = null;
//         this._multiAddrs = null;
//
//         if("idB58" in options){
//             this._idB58 = options['idB58'];
//         }else{
//             throw Error("[-] err: every peer must have idB58");
//         }
//         if("isHandshaked" in options){
//             this._isHandshaked = options['isHandshaked'];
//         }
//         if("peerInfo" in options){
//             this._peerInfo = options['peerInfo'];
//         }
//         if("peerId" in options){
//             this._peerId = options['peerId'];
//         }
//         if("isBlackListed" in options){
//             this._isBlackListed = options['isBlackListed'];
//         }
//         if("isBootstrapNode" in options){
//             this._isBootstrapNode = options['isBootstrapNode'];
//         }
//         if("connectedMultiaddr" in options){
//             this._connectedMultiaddr = options['connectedMultiaddr'];
//         }
//         if("multiAddrs" in options) {
//             this._multiAddrs = options['multiAddrs'];
//         }
//     }
//     isHandshaked(){
//         return this._isHandshaked;
//     }
//     isBlackListed(){
//         return this._isBlackListed;
//     }
//     isBootstrapNode(){
//         return this._isBootstrapNode;
//     }
//     getB58Id(){
//         return this._idB58;
//     }
//     getPeerInfo(){
//         return this._peerInfo;
//     }
//     getPeerId(){
//         return this._peerId;
//     }
//
// }
// class State{
//     constructor(){
//         this._backupPeers = {};
//         this._peers = {};
//     }
//     // addBoostrapPong(bNode,pong){
//     //     let bootstrap = {
//     //         'idB58': bNode.id.toB58String(),
//     //         'isHandshaked' : true,
//     //         'peerInfo' : bNode.peerInfo,
//     //         'peerId' : bNode.id,
//     //         'isBootstrapNode' : true
//     //     };
//     //     this.addPeer(bootstrap);
//     //
//     //     let seeds = pong.seeds();
//     //     seeds.forEach(seed=>{
//     //        this.addBackupPeer({
//     //          'idB58' :'',
//     //          'peerId' : seed.peer,
//     //          'connectedMultiaddr' : seed.connectedMultiaddr,
//     //           'multiAddrs' : seed.multiaddrs,
//     //        });
//     //     });
//     // }
//     addPeer(peer){
//         try{
//             let p = new PeerState(peer);
//             this._peers[p.getB58Id()] = p;
//             return true;
//         }catch(err){
//             console.log("[-] err creating PeerState in ctor ", err);
//             return false;
//         }
//     }
//     addBackupPeer(peer){
//         try{
//             let p = new PeerState(peer);
//             this._backupPeers[p.getB58Id()] = p;
//             return true;
//         }catch(err){
//             console.log("[-] err creating PeerState in ctor ", err);
//             return false;
//         }
//     }
//     isBlackListed(idB58){
//         if(idB58 in this._peers){
//             return this._peers[idB58].isBlackListed();
//         }
//         return false;
//     }
//     isHandshaked(idB58){
//         if(idB58 in this._peers){
//             return this._peers[idB58].isHandshaked();
//         }
//         return false;
//     }
// }
