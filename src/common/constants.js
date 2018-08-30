module.exports.namespace = 'enigma';

module.exports.ID_LEN = 46;

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

module.exports.STATUS = {
    'OK' : 0,
    'ERROR' : 1,
};

