module.exports.namespace = 'enigma';

module.exports.PROTOCOLS = {
    'PEERS_PEER_BOOK' : '/getpeerbook',
    'HANDSHAKE' :'/handshake/0.1',
    'GROUP_DIAL' : '/groupdial/0.1',
    'PEER_DISCOVERY' : 'peer:discovery',
    'PEER_CONNECT' : 'peer:connect',
};

module.exports.STATUS = {
    'OK' : 0,
    'ERROR' : 1,
};
