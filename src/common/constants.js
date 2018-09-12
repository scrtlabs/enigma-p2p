module.exports.namespace = 'enigma';

module.exports.ID_LEN = 46;

module.exports.LOG_CONFIG = {
    'level' :'debug',
    'file' : 'peer.log',
    'cli' : true,
};

module.exports.NCMD = {
    'DISCOVERED' : 'discovered', // announcing that libp2p build a new PeerInfo from given address. (ready to be discovered) -> 'peer:discovery' event.
    'HANDSHAKE_UPDATE' : 'handshake_update', // peer:discovery event handshake with pong msg
    'BOOTSTRAP_FINISH' : 'b_update_finish', // update of the connection manager bootstrap finished state
};
module.exports.PROTOCOLS = {
    'PEER_DISCOVERY' : 'peer:discovery',
    'PEER_CONNECT' : 'peer:connect',
    'PEER_DISCONNECT' : 'peer:disconnect',
    'ECHO' : '/echo',
    'PEERS_PEER_BOOK' : '/getpeerbook',
    'HANDSHAKE' :'/handshake/0.1',
    'GROUP_DIAL' : '/groupdial',
    'HEARTBEAT' : '/heartbeat/0.1'
};

module.exports.DHT_STATUS = {
    'CRITICAL_HIGH_DHT_SIZE' : 20 ,
    'OPTIMAL_DHT_SIZE' : 8,
    'CRITICAL_LOW_DHT_SIZE' : 3,
};
module.exports.MSG_STATUS = {
    'OK' : 0,
    'ERROR' : 1,
};

