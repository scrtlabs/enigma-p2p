const EventEmitter = require('events').EventEmitter
const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const series = require('async/series');
const PeerBundle = require('./libp2p-bundle');
const Pushable = require('pull-pushable');
const PeerManager = require('./PeerManager');
const constants = require('../common/constants');
const PROTOCOLS = constants.PROTOCOLS;
const Policy = require('../policy/policy');
const Messages = require('../policy/messages');
const nodeUtils = require('../common/utils');

class EnigmaNode extends EventEmitter {
    constructor(multiAddrs,isDiscover, dnsNodes,nickname){
        super();
        this.nickname = nickname;
        this.started = false;
        this.node = null;
        this.peerManager = null;
        this.multiAddrs = multiAddrs;
        this.isDiscover = isDiscover;
        this.dnsNodes = dnsNodes;
        this.policy = new Policy();
    }
    nickName(){
        return this.nickname;
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
    addHandlers(protocols,handler){

        this.handler = handler;

        // TODO:: currently ignore for testing.
        if((!this.policy.validateProtocols(protocols) || !this.started )&& false){
            throw Error('not all protocols are satisfied, check constants.js for more info.');
        }
        this.node.on('peer:discovery', (peer) => {
            console.log("got discovery => " + this.nickName());
            this.handler.handle('peer:discovery',this.node,{peer:peer,worker:this});
        });

        this.node.on('peer:connect', (peer) => {
            this.handler.handle('peer:connect', this.node, {peer:peer,worker:this});
        });

        protocols.forEach(protocolName=>{
            this.node.handle(protocolName,(protocol,conn)=>{
                this.handler.handle(protocolName,this.node,{protocol:protocol,connection:conn, worker : this});
            });
        });

    }

    /**
     * Subscribe to events with handlers and final handlers.
     * @param {Array} subscriptions, [{topic:name,topic_handler:Function,final_handler:Function}]
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
    getListeningAddrs(){
        let str_addrs = [];
        this.node.peerInfo.multiaddrs.forEach(addr=>{
            str_addrs.push(addr.toString() + '/ipfs' + this.node.peerInfo.id.toB58String());
        });
        return str_addrs;
    }
    /**
     * Get PeerInfo class of libp2p containing information about the current peer.
     * @returns {PeerInfo} peerInfo
     */
    getSelfPeerInfo(){
        //return this.peerManager.getSelfPeerInfo();
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
        this.node.dialProtocol(peerInfo,protocolName,onConnection);
    }
    /** Ping 0x1 message in the handshake process.
     * @param {PeerInfo} peerInfo , the peer info to handshake with
     * @param {Boolean} withPeerList , true = request seeds from peer false otherwise
     * */
    handshake(peerInfo,withPeerList){
        this.node.dialProtocol(peerInfo,PROTOCOLS['HANDSHAKE'],(protocol,connection)=>{
            let selfId = this.getSelfIdB58Str();
            let ping = new Messages.PingMsg({"from": selfId, "findpeers":withPeerList});
            pull(
                pull.values([ping.toNetworkStream()]),
                connection,
            );
            pull(
                connection,
                pull.map((data)=>{
                    let pongMsg = nodeUtils.toPongMsg(data);
                    if(!pongMsg.isValidMsg()){
                        // TODO:: handle invalid msg(?)
                        console.log('[-] Err bad pong msg recieved.');
                    }
                    return pongMsg.toNetworkStream();
                }),
                // TODO:: get the pong message response. if valid keep connection otherwise drop.
                pull.drain()
            );
        });
    }
    /**
     * Get some peers PeerBook
     * @param {PeerInfo} peerInfo, the target peer
     * @param {Function} onResult signature (err,PeerBook) =>{}
     */
    getPeersPeerBook(peerInfo,onResult){
        this.dialProtocol(peerInfo,PROTOCOLS.PEERS_PEER_BOOK, (protocol,connection)=>{
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
                this.dialProtocol(peer,protocolName,(protocol,conn)=>{
                    cb({'protocol':protocol,'connection':conn});
                });
            })
        });
        parallel(jobs,(err,connections)=>{
            onAllConnections(connections);
        });
    }
    /** TODO::WIP - consider this if it's event needed
     * {
    * - interval - every interval : check if satisfied, if not, look for new peers
    * - valid peer policy fn  : a fn that takes PeerInfo object and returns Boolean if it's valid
    * - max size of peers  : always optimize for that number
    * - heartbeat interval : every hb interval : check if other nodes are alive
    * }
     * */
    runConsistentDiscovery(config){
        let intervalId = setInterval(()=>{
            let peersInfo = this.getAllPeersInfo();
            let jobs = [];

            peersInfo.forEach(peer=>{
                jobs.push((cb)=>{
                        this.getPeersPeerBook(peer,cb);
                });
            });

            parallel(jobs,(err,otherPeerBooks)=>{
                console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@");
                console.log('I got other peer books', otherPeerBooks.length);
                otherPeerBooks.forEach(pb=>{
                    console.log('pb '+ pb.from.id +' has ' + pb.peers.length);
                    console.log('connected to : ');
                    console.log(pb.peers[0].peerId.id)
                    console.log(pb.peers[1].peerId.id)
                });
                console.log('my ID = ' + this.getSelfPeerInfo().id.toJSON().id.toString())
                console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
            });
        }, config.interval);
        return intervalId;
    }
}


module.exports = EnigmaNode;

