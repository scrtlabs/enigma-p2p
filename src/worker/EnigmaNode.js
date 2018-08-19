const EventEmitter = require('events').EventEmitter
const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const series = require('async/series');
const PeerBundle = require('./libp2p-bundle');
const Pushable = require('pull-pushable');


class EnigmaNode extends EventEmitter {
    constructor(multiAddrs,isDiscover, dnsNodes){
        super();
        this.node = null;
        this.multiAddrs = multiAddrs;
        this.isDiscover = isDiscover;
        this.dnsNodes = dnsNodes;
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
    /**
     * Define event handlers for the node with external delegation
     * @param {Function} handler
     * @param {Array} protocols, different protocols to listen and support
     */
    addHandlers(protocols,handler){
        this.node.on('peer:discovery', (peer) => {
            handler('peer:discovery',this.node,{peer:peer});
        });

        this.node.on('peer:connect', (peer) => {
            handler('peer:connect', this.node, {peer:peer});
        });
        protocols.forEach(protocolName=>{
            this.node.handle(protocolName,(protocol,conn)=>{
                handler(protocolName,this.node,{protocol:protocol,connection:conn});
            });
        });
    }
    /**
     * Subscribe to events with handlers and final handlers.
     * @param {Array} subscriptions, [{topic:name,topic_handler:Function,final_handler:Function}]
     */
    subscribe(subscriptions){
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
        return this.node.peerInfo;
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
        peers.forEach(peer=>{
            result.push(this.node.peerBook.get(peer));
        });
        return result;
    }
    /**
     * Start the node.
     * @param {Function} callback is a function with the following function (err) {} signature,
     * where err is an Error in case starting the node fails.
     */
    start(callback){
        this.node.start(callback);
    }
    /**
     * Stop the node.
     * @param {Function} callback is a function with the following function (err) {} signature,
     * where err is an Error in case starting the node fails.
     */
    stop(callback){
        this.node.stop(callback);
    }
    dialProtocol(peerInfo,protocolName, onConnection){
        this.node.dialProtocol(peerInfo,protocolName,onConnection);
    }

}


module.exports = EnigmaNode;

