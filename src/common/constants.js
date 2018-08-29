module.exports.namespace = 'enigma';

module.exports.ID_LEN = 46;

module.exports.PROTOCOLS = {
    'PEERS_PEER_BOOK' : '/getpeerbook',
    'HANDSHAKE' :'/handshake/0.1',
    'GROUP_DIAL' : '/groupdial',
    'PEER_DISCOVERY' : 'peer:discovery',
    'PEER_CONNECT' : 'peer:connect',
    'ECHO' : '/echo'
};

module.exports.STATUS = {
    'OK' : 0,
    'ERROR' : 1,
};

