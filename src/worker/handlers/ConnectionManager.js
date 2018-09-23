const EventEmitter = require('events').EventEmitter;
const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const Policy = require('../../policy/policy');
const constants = require('../../common/constants');
const PROTOCOLS = constants.PROTOCOLS;
const STATUS = constants.MSG_STATUS;
const N_NOTIFICATION = constants.NODE_NOTIFICATIONS;
const nodeUtils = require('../../common/utils');
const Messages = require('../../policy/messages');
const PeerBank = require('./PeerBank');

class ConnectionManager extends EventEmitter{

    constructor(enigmaNode){
        super();
        this._enigmaNode = enigmaNode;
        this._policy = new Policy();
        // context (currently Stat class)
        this._ctx = null;
        // consistent discovery logic
        this._peerBank = new PeerBank();
        this._handshakedDiscovery = [];
        // connection manager state
        this.BOOTSTRAPPED = 'BOOTSTRAPPED';
        this.NOT_BOOTSTRAPPED = 'NOTBOOTSTRAPPED';
        this._state = this.NOT_BOOTSTRAPPED;
        // the state indicates that currently the connection manager is already in search for new peers
        // to be added to the PeerBank (not establishing connection nesscearly)
        this._searchState = false;

    }
    /** add context */
    addNewContext(context){
        this._ctx = context;
    }
    /** group parallel batched request to find peers form
     * given list
     * @param {Array<PeerInfo>} peersInfo
     * @param {Function} onResponse (err,results)=>{}, 1 result ={err,fpRes,fpRes
     * @param {Integer} maxPeers, add a limit to the peer request for the peer to respect.
     * */
    groupFindPeersRequest(peersInfo, onResponse , maxPeers){
        let jobs = [];
        peersInfo.forEach(pi=>{
            jobs.push((cb)=>{
                this.findPeersRequest(pi,(err,fpReq,fpRes)=>{

                    let resObj = {};
                    resObj.err = err;
                    resObj.fpReq = fpReq;
                    resObj.fpRes = fpRes;

                    cb(null,resObj);
                },maxPeers);
            });
        });
        parallel(jobs,(err,results)=>{
            onResponse(err,results);
        });
    }
    /** update the peer bank with new list - update duplicates
     * @param {Array<PeersInfo>} peersInfo
     * */
    _updatePeerBank(peersInfo){
        this._peerBank.addPeers(peersInfo);
    }
    /** get all the handshaked peers
     * @returns {Array<PeerInfo>} handshaked peers.
     * */
    _getAllHandshakedPeers(){
        let currentPeerIds = this._enigmaNode.getAllPeersIds();

        let handshakedIds = this._ctx.getAllActiveHandshakedPeers(currentPeerIds);

        let peersInfo = this._enigmaNode.getPeersInfoList(handshakedIds);

        return peersInfo;
    }
    /** get all the handshaked outbound peers
     * @retuns {Array<PeerInfo> outbound handshaked peers }
     * */
    _getAllOutboundPeers(){
        let currentPeerIds = this._enigmaNode.getAllPeersIds();

        let handshakedIds = this._ctx.getAllActiveOutbound(currentPeerIds);

        let peersInfo = this._enigmaNode.getPeersInfoList(handshakedIds);

        return peersInfo;
    }
    // /** Try to connect to peers to get optimal number
    //  * */
    // tryDiscovery(){
    //     let optimal = this._policy.getOptimalDhtSize();
    //     let current = this._getAllOutboundPeers();
    //     let delta = optimal - current;
    //
    //     // if delta<0 or not critical STOP
    //     if(!this._isCriticalDhtSize()){
    //         return;
    //     }
    //
    //     // get potential peers - list of PeerInfo
    //     let wishList = this._getShuffledKPotentialPeers(delta);
    //
    //     // required peers to explore
    //     let peerGapSize = wishList.length - delta;
    //
    //     // fill the gap
    //     if(peerGapSize > 0){
    //         let all = this._enigmaNode.getAllPeersInfo();
    //         this.groupFindPeersRequest(all,(err,results)=>{
    //
    //             if(err){
    //                 // TODO:: do something
    //                 return;
    //             }
    //             let newPeers = [];
    //
    //             results.forEach(result=>{
    //                 if(result.err){
    //                     //TODO:: do something
    //                     return;
    //                 }
    //                 newPeers.push(result.fpRes.peers());
    //             });
    //
    //             this._updatePeerBank(newPeers);
    //
    //             wishList = this._getShuffledKPotentialPeers(delta);
    //
    //             this._sendParallelHandshakes(wishList,true,(err,results)=>{
    //
    //             })
    //         });
    //     }
    // }

    /** if the dht size is critical (very low in policy)
     * @returns {Boolean} true - critical, false otherwise
     * */
    _isCriticalDhtSize(){
        let optimal = this._policy.getOptimalDhtSize();
        let current = this._getAllOutboundPeers();
        let delta = optimal - current;

        if(delta<0){
            return false;
        }

        return (this._policy.getCriticalLowDhtSize() >= delta);
    }
    /**
     * analyze the peer book to see the dht status
     * @returns {Json}  {status: "{STABLE}/{SYNC}/{CRITICAL_LOW}/{CRITICAL_HIGH/DISCONNECTED}", number: number of peers to add/ remove(?)}
     * */
    dhtStatus(){
        return this._policy.getDhtStauts(this._enigmaNode.getSelfPeerBook());
    }
    /** /findpeers/0.1
     * Singal request to a peer for findpeers
     * @param {PeerInfo} peerInfo , the target peer
     * @param {Function} onResponse, callback (err,fpReq,fpRes)=>{}
     * @param {Integer} maxPeers, limit the amount of peers request
     * */
    findPeersRequest(peerInfo, onResponse, maxPeers){
        this._enigmaNode.findPeers(peerInfo,(err,fpReq,fpRes)=>{
            console.log("got find peers request");
            // TODO:: Continue from here.
            // TODO:: This is a helper function to get peers.
            // TODO:: my real function is the one that will complete the dht to optimal using libp2p.findpeer and the PeerBank.
            onResponse(err,fpReq,fpRes);
        }, maxPeers);
    }
    /** get k peers from the peer bank or if k is bigger than current peer bank
     * return all existing potential peers.
     * peers returned are NOT duplicated && NOT connected already => potential peers.
     * @returns {Array<PeerInfo>} final
     * */
    _getShuffledKPotentialPeers(k){
        let potential = this._peerBank.getRandomPeers(k);
        let final = [];
        potential.forEach(p=>{
            let id = p.peerId.id;
            if(!this._enigmaNode.isConnected(id)){
                final.push(p);
            }else{
                this._peerBank.markPeer(id);
            }
        });
        return final;
    }
    /**
     * Send a batch of handshake requests and get all peers once done
     * @param {Array<PeerInfo>} peersInfo, list of peers to handshake with
     * @param {Boolean} withPeers , true => request seeds list, otherwise false.
     * @param {Function} onAllHandshakes , (err,results)=>{}
     * The results is == [{peerInfo,err,ping,pong},...]
     * */
    _sendParallelHandshakes(peersInfo, withPeers,onAllHandshakes){
        let jobs = [];
        peersInfo.forEach(pi=>{
            jobs.push((cb)=>{
                this._enigmaNode.handshake(pi,withPeers,(err,ping,pong)=>{
                    let resultObject = {};
                    resultObject.peerInfo = pi;
                    resultObject.err = err;
                    resultObject.ping = ping;
                    resultObject.pong = pong;
                    cb(null,resultObject);
                });
            });
        });
        parallel(jobs,(err,results)=>{
            onAllHandshakes(err,results);
        });
    }
    /** Ping 0x1 message in the handshake process.
     * @param {PeerInfo} peerInfo , the peer info to handshake with
     * @param {Boolean} withPeerList , true = request seeds from peer false otherwise
     * @param {Function} onHandshake , (err,ping,pong)=>{}
     * */
    handshake(peerInfo,withPeerList,onHandshake){
        this._enigmaNode.handshake(peerInfo,withPeerList,(err,ping,pong)=>{
                //TODO:: open question: if it's early connected peer to DNS then it would get 0
                //TODO:: peers, in that case another query is required.
                if(err){
                    //TODO:: handle the error
                    console.log("[-] Err performing handshake : " + err);
                }
                else if(!err && pong != null && pong.status() == STATUS['OK']) {
                    this._peerBank.addPeers(pong.seeds());
                    this._handshakedDiscovery.push(pong);
                    this.notify({
                        'notification' : N_NOTIFICATION['HANDSHAKE_UPDATE'],
                        'connectionType': 'outbound',
                        'status' : pong.status(),
                        'pong' : pong,
                        'discoverd_num' : this._handshakedDiscovery.length,
                        'who' : peerInfo
                    });
                    this._updateState();
                }
                if(nodeUtils.isFunction(onHandshake)){
                    onHandshake(err,ping,pong);
                }
            });
    }

    /** check and set the ConnectionManager state
     * State NOT_BOOTSTRAPPED - not boostrapped yet
     * State BOOSTRAPPED - finished bootstrapping*/
    _updateState(){
        if(this._state === this.NOT_BOOTSTRAPPED){
            // check if should be changed + notify
            let currentNum = this._handshakedDiscovery.length;

            if(this._policy.isEnoughBNodes(currentNum)){

                this._state = this.BOOTSTRAPPED;

                this.notify({
                    'notification' : N_NOTIFICATION['BOOTSTRAP_FINISH'],
                    'connectedNodes' : currentNum
                });
            }

        }else if(this._state === this.BOOTSTRAPPED){
            //TODO:: see what other states are needed if any.
            // check if some node is missing?
        }
    }

    /**
     * Notify observer (Some controller subscribed)
     * @param {Json} params, MUTS CONTAINT notification field
     * */
    notify(params){
        this.emit('notify',params);
    }
    /** Ping 0x1 message in the handshake process.
     * @param {PeerInfo} peerInfo , the peer info to handshake with
     * @param {Boolean} withPeerList , true = request seeds from peer false otherwise
     * @param {Function} onHandshake , (err,ping,pong)=>{}
     * @returns {Promise}
     * */
    sync_handshake(peerInfo, withPeerList){
        return new Promise((resolve,reject)=>{
            this._enigmaNode.handshake(peerInfo,withPeerList,(err,ping,pong)=>{
                if(err) reject(err,ping,pong);
                resolve(err,ping,pong);
            });
        });
    }

    /**Send a heart-beat to some peer
     * @params {PeerInfo} peer, could be string b58 id as well (not implemented error atm for string)
     * @returns {Promise} Heartbeat result
     * */
    sendHeartBeat(peer){
        return new Promise((resolve,reject)=>{

            let peerInfo;

            if(nodeUtils.isString(peer)){
                // TODO:: create PeerInfo from B58 id
                throw {name : "NotImplementedError", message : "too lazy to implement"};

            }else{
                // PeerInfo
                peerInfo = peer;
            }
            // build the msg
            let heartBeatRequest = new Messages.HeartBeatReqMsg({
                "from" : this._enigmaNode.getSelfIdB58Str(),
                "to" : peerInfo.id.toB58String(),
            });
            if(!heartBeatRequest.isValidMsg()){
                // TODO:: Add logger.
                reject("[-] Err in HBReq msg ")
            }
            // send the request
            this._enigmaNode.sendHeartBeat(peerInfo,heartBeatRequest,(err,hbResponse)=>{
                if(err) reject(err);

                resolve(hbResponse);
            });

        });
    }

}

module.exports = ConnectionManager;

