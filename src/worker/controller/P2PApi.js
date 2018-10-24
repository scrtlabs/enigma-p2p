const EventEmitter = require('events').EventEmitter;
class P2PApi extends EventEmitter{

    constructor(){
        super();
    }

    execCmd(cmd,params){
        this.emit('execCmd', cmd,params);
    }
    addPeer(maStr){
        this.emit('addPeer', maStr);
    }
    getSelfAddrs(callback){
        this.emit('getSelfAddrs', callback);
    }
    getAllOutboundHandshakes(callback){
        this.emit('getAllOutboundHandshakes',callback);
    }
    getAllInboundHandshakes(callback){
        this.emit('getAllInboundHandshakes',callback);
    }
    getAllPeerBank(callback){
        this.emit('getAllPeerBank',callback);
    }
    tryConsistentDiscovery(){
        this.emit('tryConsistentDiscovery');
    }
    broadcast(content){
        this.emit('broadcast',content);
    }
    /** temp */
    provideContent(){
        this.emit('provideContent');
    }
    /** temp */
    findContent(){
        this.emit('findContent');
    }
    /** temp */
    findContentAndSync(){
        this.emit('findContentAndSync');
    }
    /** temp - is connection (no handshake related simple libp2p */
    isSimpleConnected(nodeId){
        this.emit('isSimpleConnected',nodeId);
    }
}

module.exports = P2PApi;