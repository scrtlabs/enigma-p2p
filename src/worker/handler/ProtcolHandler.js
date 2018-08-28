const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const Policy = require('./policy');
const nodeUtils = require('../../common/utils');
const EventEmitter = require('events').EventEmitter
const constants = require('../../common/constants');
const PROTOCOLS = constants.PROTOCOLS;
const STATUS = constants.STATUS;
const Messages = require('../../policy/messages');
class ProtocolHandler extends EventEmitter{

    constructor(){
        super();
        this.fallback = this.tempFallback;
        this.policy = new Policy();

        this.handlers = {};
        this.handlers[PROTOCOLS['PEER_DISCOVERY']] = this.onPeerDiscovery;
        this.handlers[PROTOCOLS['PEER_CONNECT']] = this.onPeerConnect;
        this.handlers[PROTOCOLS['PEERS_PEER_BOOK']] = this.onGetPeerBook;
        this.handlers[PROTOCOLS['GROUP_DIAL']] = this.onGroupDial;
        this.handlers[PROTOCOLS['HANDSHAKE']] = this.onHandshake;
    }

    handle(protocolName, nodeNundle, params){
        if(!this.policy.isValidProtocol(protocolName)){
            this.fallback(protocolName, nodeNundle,params);
        }
        this.handlers(protocolName)(nodeNundle,params);
    }

    tempFallback(protocolName){
        console.log('[-] Err invalid protocolName: ' + protocolName);
    }
    onGetPeerBook(nodeBundle, params){
        let selfNode = params.worker;
        let peers = selfNode.getAllPeersInfo();
        let parsed = nodeUtils.parsePeerBook(peers);
        // stream back the connection
        pull(
            pull.values([JSON.stringify({
                "from" : selfNode.getSelfPeerInfo().id.toJSON(),
                "peers" : parsed})]),
            params.connection
        );
    }
    onPeerDiscovery(nodeBunle, params){
        nodeBundle.dial(params.peer,()=>{
            // perform handshake
            let worker = params.worker;
            let withPeerList = true;
            worker.handshake(params.peer, withPeerList);
        });
    }
    /**This event is triggerd uppon a handshake request
     * Meaning, a ping message is attached
     * Should check if findpeers is True and attach peer list
     * Compose a PongMsg and send back
     * TODO:: Should validate if connection is desired or not.
     * */
    onHandshake(nodeBundle,params){
        let conn = params.connection;
        let worker = params.worker;
        pull(
            conn,
            pull.map((data) => {
                ping = data.toString('utf8').replace('\n', '');
                ping = JSON.parse(ping);
                let pingMsg = new Messages.PingMsg(ping);
                if(pingMsg.isValidMsg()){
                    // create pong msg
                    if(ping.findPeers()){
                        let seeds = worker.getAllPeersInfo();
                        let parsed = nodeUtils.parsePeerBook(seeds);
                    }
                    let pong = new Messages.PongMsg({
                        "id" : ping.id(),
                        "from":worker.getSelfIdB58Str(),
                        "to":ping.from(),
                        "status":STATUS['ok'],
                        "seeds":parsed});
                    // validate correctness
                    if(pong.isValidMsg()){
                        return pong.toJSON();
                    }
                }else{
                    // TODO:: drop connection and return err
                }
            }),
            pull.drain(conn)
        );
    }
    onPeerConnect(nodeBundle,params){
        console.log('[Connection with '+ node.peerInfo.id.toB58String()+
            '] from : ' + peer.id.toB58String());
        // do stuff after connection (?)
    }
    onGroupDial(nodeBundle,params){
        let connection = params.connection;
        let selfWorker = params.worker;
        // handle the message recieved from the dialing peer.
        console.log(selfWorker.getSelfPeerInfo().id.toB58String() +  ' => got a groupdial');
        pull(
            connection,
            connection
        );
    }
}

