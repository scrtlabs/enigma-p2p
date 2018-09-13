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
const CMD = constants.NCMD;
const nodeUtils = require('../../common/utils');
const Messages = require('../../policy/messages');
const PeerBank = require('./PeerBank');
class ConnectionManager extends EventEmitter{

    constructor(enigmaNode, policy){
        super();
        this._enigmaNode = enigmaNode;
        this._policy = policy;

        // consistent discovery logic
        this._peerBank = new PeerBank();
        this._handshakedDiscovery = [];
        // connection manager state
        this._statesList = ['INITIAL','NOT_BOOTSTRAPPED','BOOTSTRAPPED'];
        this.BOOTSTRAPPED = 'BOOTSTRAPPED';
        this.NOT_BOOTSTRAPPED = 'NOTBOOTSTRAPPED';
        this._state = this.NOT_BOOTSTRAPPED;
    }
    /**
     * analyze the peer book to see the dht status
     * @returns {Json}  {status: "{STABLE}/{SYNC}/{CRITICAL_LOW}/{CRITICAL_HIGH/DISCONNECTED}", number: number of peers to add/ remove(?)}
     * */
    dhtStatus(){
        return this._policy.getDhtStauts(this._enigmaNode.getSelfPeerBook());
    }
    /** /findpeers/0.1
     * */
    findPeersRequest(peerInfo, maxPeers){
        this._enigmaNode.findPeers(peerInfo,(err,fpReq,fpRes)=>{
            console.log("got find peers request");
        }, maxPeers);
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
                        'cmd' : CMD['HANDSHAKE_UPDATE'],
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
                    'cmd' : CMD['BOOTSTRAP_FINISH'],
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
     * @param {Json} params, MUTS CONTAINT cmd field
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