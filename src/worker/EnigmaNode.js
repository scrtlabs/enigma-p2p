const EventEmitter = require('events').EventEmitter;
const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const PeerBundle = require('./libp2p-bundle');
const constants = require('../common/constants');
const PROTOCOLS = constants.PROTOCOLS;
const MSG_STATUS = constants.MSG_STATUS;
const Policy = require('../policy/policy');
const Messages = require('../policy/messages');
const nodeUtils = require('../common/utils');

class EnigmaNode extends EventEmitter {

    constructor(config,protocolHandler){
        super();
        this.nickname = config.nickname;
        this.multiAddrs = config.multiAddrs;
        this.isDiscover = config.isDiscover;
        this.dnsNodes = config.dnsNodes;
        this._pathPeerId = null;
        if("pathPeerId" in config && config["pathPeerId"] != null && config["pathPeerId"] != undefined){
            this._pathPeerId = config.pathPeerId;
        }
        this.started = false;
        this.node = null;
        this.policy = new Policy();
        this._handler = protocolHandler;
    }
    nickName(){
        return this.nickname;
    }
    getProtocolHandler(){
        return this._handler;
    }
    isBootstrapNode(id){
        return this.dnsNodes.some(ma=>{
            let bid = ma.substr(ma.length - constants.ID_LEN,ma.length);
            return bid == id;
        });
    }
    /**
     * Loads a peer info JSON from a given path and creates a node instance
     * @param {String} path
     * @param {Function} empty callback with no params
     */
    loadNode(path,callback){
        PeerId.createFromJSON(require(path), (err, idListener) => {
            if (err) throw err;

            const peerInfo = new PeerInfo(idListener);
            this.multiAddrs.forEach(addr=>{
                peerInfo.multiaddrs.add(addr);
            });
            this.node = new PeerBundle({
                peerInfo,
                config: {
                    peerDiscovery: {
                        bootstrap: {
                            enabled: this.isDiscover,
                            list: this.dnsNodes
                        }
                    }
                }
            });
            setTimeout(callback,100);
        });
    }
    /**
     * Create a random peerInfo and initialize a node instance
     * @param {String} path
     * @param {Function} empty callback with no params
     */
    createNode(callback){
        waterfall([
            (cb) => PeerInfo.create(cb),
            (peerInfo, cb) => {
                this.multiAddrs.forEach(addr=>{
                    peerInfo.multiaddrs.add(addr);
                });
                this.node = new PeerBundle({
                    peerInfo,
                    config: {
                        peerDiscovery: {
                            bootstrap: {
                                enabled: this.isDiscover,
                                list: this.dnsNodes
                            }
                        }
                    }
                });
                setTimeout(cb,100);
            }
        ], (err) => callback(err));
    }
    /** Promise
     * Create a random peerInfo and initialize a node instance
     * @returns {Promise}
     */
    syncCreateNode(){
        return new Promise((res,rej)=>{
            this.createNode(err=>{
                if(err) rej(err);
                res(this);
            })
        });
    }
    /** Promise
     * Load PeerID and create the peerInfo
     * @returns {Promise}
     */
    syncLoadNode(path){
        return new Promise((res,rej)=>{
            this.loadNode(path, ()=>{
                res(this);
            });
        });
    }
    /**
     * Define event handlers for the node with external delegation
     * @param {Function} handler
     * @param {Array} protocols, different protocols to listen and support
     */
    addHandlers(){

        let protocols = this._handler.getProtocolsList();

        // TODO:: currently ignore for testing.
        if((!this.policy.validateProtocols(protocols) || !this.started ) && false){
            throw Error('not all protocols are satisfied, check constants.js for more info.');
        }
        this.node.on(PROTOCOLS['PEER_DISCOVERY'], (peer) => {
            this._handler.handle(PROTOCOLS['PEER_DISCOVERY'],this.node,{peer:peer,worker:this});
        });

        this.node.on(PROTOCOLS['PEER_CONNECT'], (peer) => {
            this._handler.handle(PROTOCOLS['PEER_CONNECT'], this.node, {peer:peer,worker:this});
        });
        this.node.on(PROTOCOLS['PEER_DISCONNECT'], (peer) => {
            this._handler.handle(PROTOCOLS['PEER_DISCONNECT'], this.node, {peer:peer,worker:this});
        });
        protocols.forEach(protocolName=>{
            this.node.handle(protocolName,(protocol,conn)=>{
                this._handler.handle(protocolName,this.node,{protocol:protocol,connection:conn, worker : this});
            });
        });

    }

    /** isConnected to a peer
     * This function uses try/catch because of the DHT implementation
     * @param {String} strId, some peer ID;
     * @returns {Boolean} found - true = connected false otherwise
     * */
    isConnected(strId){
        let found = false;
        if(strId === this.getSelfIdB58Str()){
            return found;
        }

        try{
            let peer = this.getSelfPeerBook().get(strId);
            if (peer!= null)
                found = true;
        }catch(err){
            found = false;
        }
        return found;
    }
    /**
     * Subscribe to events with handlers and final handlers.
     * @param {Array} subscriptions, [{topic:name,topic_handler:Function(msg)=>{},final_handler:Function()=>{}}]
     */
    subscribe(subscriptions){
        if(!this.started){
            throw Error('Please start the Worker before subscribing');
        }
        subscriptions.forEach(sub=>{
            this.node.pubsub.subscribe(sub.topic,sub.topic_handler,sub.final_handler);
        });
    }
    /**
     * Broadcast some message about a specific topic
     * @param {String} topic, topic name
     * @param {Buffer} content, Buffer.from('some msg')
     * @param {Function} oncePublishedCallback, no params callback notifying that the message was published
     */
    broadcast(topic, content, oncePublishedCallback){
        this.node.pubsub.publish(topic,content,oncePublishedCallback);
    }
    /**
     * Broadcast some message about a specific topic in a LOOP
     * @param {String} topic, topic name
     * @param {Integer} interval , rate in milli of broadcasting
     * @param {Buffer} content, Buffer.from('some msg')
     * @param {Function} oncePublishedCallback, no params callback notifying that the message was published
     * @returns {Integer} intervalID , the ID of the interval to be shutdown in another context
     */
    broadcastLoop(topic, interval, content,oncePublishedCallback){
        let intervalID = setInterval(()=>{
            this.broadcast(topic,content,oncePublishedCallback)
        },interval);
        return intervalID;
    }
    /**
     * Get a string array of full multiaddresses of the Node.
     * @returns {Array} str_addrs, array of multi-addresses in str format
     */
    //maStr = '/ip4/127.0.0.1/tcp/36601/ipfs/QmdvtnrtdzgXreTPRWfDbPguNsLC7vq4MK4AULKxfHU73F/';
    getListeningAddrs(){
        let str_addrs = [];
        this.node.peerInfo.multiaddrs.forEach(addr=>{
            str_addrs.push(addr.toString());
        });
        return str_addrs;
    }
    /**
     * Get PeerInfo class of libp2p containing information about the current peer.
     * @returns {PeerInfo} peerInfo
     */
    getSelfPeerInfo(){
        return this.node.peerInfo;
    }
    /**
     * Get id in format of base58 str
     * @returns {String} peer-id
     */
    getSelfIdB58Str(){
        return this.getSelfPeerInfo().id.toJSON().id;
    }
    /**
     * Get All current peers String ID
     * @returns {Array} id's
     */
    getAllPeersIds(){
        return this.node.stats.peers();
    }
    /** Get PeerBook
     * @returns {PeerBook} , peerBook of the current EnigmaNode
     * */
    getSelfPeerBook(){

        return this.node.peerBook;
    }
    /**
     * Get All the Peer info from the peer book.
     * @returns {Array} [PeerInfo]
     */
    getAllPeersInfo(){
        let peers = this.getAllPeersIds();
        let result = [];
        // get peers info by id
        peers.forEach(peer=>{
            try{
                result.push(this.node.peerBook.get(peer));
            }catch(err){
                console.log('[-] Error finding peer',err);
            }
        });
        return result;
    }
    /** Get the peer info of a given list of id's
     * @param {Array<String>} idsList , b58
     * @returns {Array<PeerInfo>} peersInfo
     * */
    getPeersInfoList(idList){
        let peers =idList;
        let result = [];
        // get peers info by id
        peers.forEach(peer=>{
            try{
                result.push(this.node.peerBook.get(peer));
            }catch(err){
                console.log('[-] Error finding peer',err);
            }
        });
        return result;
    }
    /**
     * Start the node.
     * @param {Function} callback is a function with the following function (err) {} signature,
     * where err is an Error in case starting the node fails.
     */
    start(callback){
        this.node.start((err)=>{
            this.started = true;
            callback();
        });
    }

    /** !! This is a high api function that should be used after new EnigmaNode(options)... just do node.run();
     * run the node (build first)
     * @returns {Promise}
     * */
    syncRun(){
        return new Promise(async (resolve,reject)=>{
            // load node
            await this.syncInit(this._pathPeerId);
            // start the node
            await this.syncStart();
            // add handlers
            this.addHandlers();
            // TODO:: add subscriptions
            resolve(this);
        });
    }
    /**
     * Sync Start the node.
     * where err is an Error in case starting the node fails.
     * @returns {Promise}
     */
    syncStart(){
        return new Promise((res,rej)=>{
            this.start(()=>{
                console.log(this.nickName() + " has started. id = " + this.getSelfIdB58Str());
                res(this);
            });
        });
    }
    /** Init the node - either load the id from a file or create a new random one
     * This function should be called after the new EnigmaNode()
     * @param {String} , path to node id, default null -> create a new random id s
     * @returns {Promise} promise
     **/
    syncInit(path = null){
        if(path){
            return this.syncLoadNode(path);
        }else{
            return this.syncCreateNode();
        }
    }
    /**
     * Stop the node.
     * @param {Function} callback is a function with the following function (err) {} signature,
     * where err is an Error in case stopping the node fails.
     */
    stop(callback){
        this.node.stop(callback);
    }
    /**
     * Sync Stop the node.
     * where err is an Error in case stopping the node fails.
     * @returns {Promise}
     */
    syncStop(){
        return new Promise((res,rej)=>{
            this.stop((err)=>{
                if(err) rej(err);
                res(this);
            });
        });
    }
    /**
     * Dial at some protocol and delegate the handling of that connection
     * @param {PeerInfo} peerInfo ,  the peer we wish to dial to
     * @param {String} protocolName , the protocl name /echo/1.0.1
     * @param {Function} onConnection recieves (protocol,connection) =>{}
     */
    dialProtocol(peerInfo,protocolName, onConnection){
        if(peerInfo.id.toB58String() === this.getSelfIdB58Str()){
            console.log("[-] Error : " + MSG_STATUS.ERR_SELF_DIAL);
            return;
        }else{
            this.node.dialProtocol(peerInfo,protocolName,onConnection);
        }
    }
    /** Ping 0x1 message in the handshake process.
     * @param {PeerInfo} peerInfo , the peer info to handshake with
     * @param {Boolean} withPeerList , true = request seeds from peer false otherwise
     * @param {Function} onHandshake , (err,dialedPeerInfo,ping,pong)=>{}
     * */
    handshake(peerInfo,withPeerList,onHandshake){
        if(!PeerInfo.isPeerInfo(peerInfo)){
            nodeUtils.peerBankSeedtoPeerInfo(peerInfo,(err,parsedPeerInfo)=>{
                if(err){
                    onHandshake(err,null,null);
                }else{
                    this._afterParseHandshake(parsedPeerInfo,withPeerList,onHandshake)
                }
            });
        }else{
            this._afterParseHandshake(peerInfo,withPeerList,onHandshake);
        }
    }
    /** Internal use
     * this method is called by the handshake method, the top level method will verify and try parse the PeerInfo
     * incase not valid.
     * */
    _afterParseHandshake(peerInfo,withPeerList,onHandshake){

        this.node.dialProtocol(peerInfo,PROTOCOLS['HANDSHAKE'],(connectionErr,connection)=>{
            if(connectionErr) {
                onHandshake(connectionErr,null,null,null);;
                return;
            }
            let err = null;
            let selfId = this.getSelfIdB58Str();
            let ping = new Messages.PingMsg({
                "from": selfId,
                "to" : peerInfo.id.toB58String(),
                "findpeers":withPeerList});
            pull(
                pull.values([ping.toNetworkStream()]),
                connection,
                pull.collect((err,response)=>{
                    if(err){
                        console.log("[-] Err " , err);
                        return onHandshake(err,null,null,null);
                    }
                    let data = response;
                    let pongMsg = nodeUtils.toPongMsg(data);
                    if(!pongMsg.isValidMsg()){
                        // TODO:: handle invalid msg(?)
                        err = '[-] Err bad pong msg recieved.';
                    }

                    // TODO:: REPLACE THAT with normal notify,
                    //TODO:: The question is - where do i notify forall inbound/outbound handshakes see constats.js for HANDSHAKE_OUTBOUND/INBOUND actions.
                    this.emit("notify",pongMsg);
                    onHandshake(err,peerInfo,ping,pongMsg);
                    return pongMsg.toNetworkStream();
                })
            );
        });
    }
    /**
     * Notify observer (Some controller subscribed)
     * @param {Json} params, MUTS CONTAINT notification field
     * */
    notify(params){
        this.emit('notify',params);
    }

    /**
     * Get some peers PeerBook
     * @param {PeerInfo} peerInfo, the target peer
     * @param {Function} onResult signature (err,PeerBook) =>{}
     */
    getPeersPeerBook(peerInfo,onResult){
        this.dialProtocol(peerInfo,PROTOCOLS.PEERS_PEER_BOOK, (connectionErr,connection)=>{
            if(connectionErr){
                console.log("[-] err connection to peer");
                return onResult(connectionErr,null);
            }
            let peersPeerBook = null;
            let err = null;
            pull(
                connection,
                pull.map((data) => {
                    peersPeerBook = data.toString('utf8').replace('\n', '');
                    peersPeerBook = JSON.parse(peersPeerBook);
                    onResult(err,peersPeerBook);
                    return peersPeerBook;
                }),
               pull.drain()
            );
        });
    }
    /**
     * Post a findpeers msg protocol request to another peer
     * @param {PeerInfo} peerInfo, the target peer
     * @param {Integer} maxPeers , maximal number of peers
     * @param {Function} onResult signature (err,findPeersRequest, findPeersResponse) =>{}
     */
    findPeers(peerInfo,onResult,maxPeers){
        if(peerInfo.id.toB58String() === this.getSelfIdB58Str()){
            return onResult(MSG_STATUS.ERR_SELF_DIAL, null,null);
        }
        this.dialProtocol(peerInfo,PROTOCOLS.FIND_PEERS, (connErr, connection)=>{

            if(connErr){
                console.log("[-] err connection to peer");
                return onResult(connErr,null);
            }

            // create findpeers msg
            let findPeersReq = new Messages.FindPeersReqMsg({
                "from" : this.getSelfIdB58Str(),
                "to" : peerInfo.id.toB58String(),
                "maxpeers" : maxPeers
            });

            if(!findPeersReq.isValidMsg()){
                console.log("[-] err creating findpeer request msg.");
                return onResult(new Error("err creating findpeer request msg."),null);
            }
            // post msg
            pull(
                pull.values([findPeersReq.toNetworkStream()]),
                connection,
                pull.collect((err,response)=>{
                    if(err){
                        console.log("[-] err parsing findpeers response msg.");
                        return onResult(err,null);
                    }
                    let findPeersResponseMsg = nodeUtils.toFindPeersResMsg(response);
                    // validate the msg (same id as request, structure etc)
                    if(!findPeersResponseMsg.isCompatibleWithMsg(findPeersReq)){
                        console.log("[-] err parsing findpeers response msg.");
                        return onResult(new Error("Invalid find peers response msg"),null);
                    }
                    onResult(null,findPeersReq,findPeersResponseMsg);
                })
            );

        });
    }
    /**
     * Sync Get some peers PeerBook
     * @param {PeerInfo} peerInfo, the target peer
     * @param {Function} onResult signature (err,PeerBook) =>{}
     * @returns {Promise}, peersbook || err
     */
    syncGetPeersPeerBook(peerInfo){
        return new Promise((res,rej)=>{
            this.getPeersPeerBook(peerInfo,(err,peerBook)=>{
                if(err) rej(err);
                res(peerBook);
            });
        });
    }

    /**TEMPORARY method
     * @params {String} protocolName
     * @params {Function} onEachResponse , (protocol,connection)
     * dial to all peers on the list and for each connection activate onResponse callback with (protocol,connection) params
     * */
    groupDial(protocolName, onEachResponse){
        let peersInfo = this.getAllPeersInfo();
        peersInfo.forEach(peer=>{
            this.dialProtocol(peer,protocolName,onEachResponse);
        });
    }
    /**Send a heart-beat to some peer
     * @params {PeerInfo} peer, could be string b58 id as well
     * @params {HeartBeatReq} heartBeatRequest , the request
     * @returns {Promise} Heartbeat result
     * */
    sendHeartBeat(peerInfo,heartBeatRequest,onResult){
        this.dialProtocol(peerInfo,PROTOCOLS['HEARTBEAT'],(protocol,conn)=>{
            pull(
                pull.values([heartBeatRequest.toNetworkStream()]),
                conn,
                pull.collect((err,response)=>{
                    if(err) {
                        //TODO:: add Logger
                        console.log("[-] Err in collecting HBRes msg",err);
                        onResult(err,null);
                    }else{
                        // validate HeartBeat Message response
                        let heartBeatRes = nodeUtils.toHeartBeatResMsg(response);
                        if(heartBeatRes.isCompatibleWithMsg(heartBeatRequest)){
                            // TODO:: validate ID equals in response, valid connection (possibly do nothing)
                            // TODO:: Add to stats (?)
                            onResult(null,heartBeatRes);
                        }else{
                            //TODO:: The heartbeat message failed (weird) why? wrong id?
                            //TODO:: anyway, drop the message and do something in response.
                            //TODO:: maybe drop the peer (?)
                            //TODO:: add Logger
                            onResult(err,null);
                        }
                    }
                })
            );
        });
    }
    /**TEMPORARY method
     * @params {String} protocolName
     * @params {Function} onAllConnections , (err,[{protocol,connection}])
     * dial to all peers on the list and for each connection activate onResponse callback with (protocol,connection) params
     * */
    groupDialBatch(protocolName, onAllConnections){
        let peersInfo = this.getAllPeersInfo();
        let jobs = [];
        peersInfo.forEach(peer=>{
            jobs.push((cb)=>{
                this.dialProtocol(peer,protocolName,(connErr,conn)=>{
                    cb({'error':conErr,'connection':conn});
                });
            })
        });
        parallel(jobs,(err,connections)=>{
            onAllConnections(connections);
        });
    }

}


module.exports = EnigmaNode;

