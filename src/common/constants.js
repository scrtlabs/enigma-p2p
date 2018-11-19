module.exports.namespace = 'ipfs';
module.exports.configPath = '../../../configs/debug';
module.exports.ID_LEN = 46;

module.exports.LOG_CONFIG = {
  'level': 'debug',
  'file': 'peer.log',
  'cli': true,
};
module.exports.NODE_NOTIFICATIONS = {
  'DISCOVERED': 'discovered', // announcing that libp2p build a new PeerInfo from given address.
  // (ready to be discovered) -> 'peer:discovery' event.
  'HANDSHAKE_OUTBOUND': 'hs_outbound', // performed handshake with node as outbound operation, e.g. outbound connection
  'HANDSHAKE_INBOUND': 'hs_inbound', // performed answer to handshake // meaning responded to incoming request
  'HANDSHAKE_UPDATE': 'handshake_update', // peer:discovery event handshake with pong msg // outbound connection
  'BOOTSTRAP_FINISH': 'b_update_finish', // update of the connection manager bootstrap finished state
  'CONSISTENT_DISCOVERY': 'c_discover', // run consistent discovery mechanism
  'PUBSUB_PUB': 'publish', // publish notification that activates a publish action
  'PERSISTENT_DISCOVERY_DONE': 'p_done', // persistent discovery is done, at the end of every attempt to get optimal DHT
  'STATE_SYNC_REQ': 'ssyncreq', // initial request from some remote peer to get states.the provider is receiving this.
  //TODO::'CONTENT_ANNOUNCEMENT' is temporary to support test cli
  'CONTENT_ANNOUNCEMENT': 'announce_content', // request to announce to the network the contents of cids
  'FIND_CONTENT_PROVIDER': 'findcprovider', // given a list of descriptors find providers in the network
  'FIND_PEERS_REQ': 'findpeerreq', // send a find peer request message
  'IDENTIFY_MISSING_STATES_FROM_REMOTE' : 'identify', // identify the missing states, compare local with remote
  'TRY_RECEIVE_ALL' : 'trcva', // try recieve all of the CID's
  'ANNOUNCE_LOCAL_STATE' : 'alc', // announce local state (after being synced)
  'DB_REQUEST' : 'dbreq', // some db request to core
  'GET_ALL_TIPS' : 'getat', // get all tips from cache/core
  'GET_ALL_ADDRS' : 'getaa', // get all addrs from cache/core
  'GET_DELTAS' : 'getds' // get deltas request from core
};
/** DO NOT CHANGE THE VALUES */
module.exports.PROTOCOLS = {
  'PEER_DISCOVERY': 'peer:discovery',
  'PEER_CONNECT': 'peer:connect',
  'PEER_DISCONNECT': 'peer:disconnect',
  'ECHO': '/echo',
  'PEERS_PEER_BOOK': '/getpeerbook',
  'FIND_PEERS': '/findpeers/0.1',
  'HANDSHAKE': '/handshake/0.1',
  'GROUP_DIAL': '/groupdial',
  'HEARTBEAT': '/heartbeat/0.1',
  'STATE_SYNC': '/sync/0.1',
};

/** DO NOT CHANGE THE VALUES SINCE ITS PART OF THE PROTOCOL MESSAGE FIELDS */
module.exports.P2P_MESSAGES = {
  'SYNC_STATE_REQ': 'SYNC_STATE_REQ',
  'SYNC_STATE_RES': 'SYNC_STATE_RES',
  'SYNC_BCODE_REQ': 'SYNC_BCODE_REQ',
  'SYNC_BCODE_RES': 'SYNC_BCODE_RES',
};

module.exports.PUBSUB_TOPICS = {
  'BROADCAST': '/broadcast/0.1',
};

module.exports.DHT_STATUS = {
  CRITICAL_HIGH_DHT_SIZE: 20,
  OPTIMAL_DHT_SIZE: 8,
  CRITICAL_LOW_DHT_SIZE: 3,
};
module.exports.MSG_STATUS = {
  OK: 0,
  ERROR: 1,
  ERR_EMPTY_PEER_BANK: 2,
  ERR_SELF_DIAL: 3,
};

module.exports.CONTENT_ROUTING = {
  // each sync req msg should consist out of RANGE_SIZE this will determine the amount of "chunks" send over the stream each time.
  RANGE_LIMIT : 10,
  TIMEOUT_FIND_PROVIDER : 180000,// 3 minutes, t.o before declaring couldn't find content provider
};
/**
 * Stat Types:
 * - CONNECTION_SUCCESS // dial success
 * - CONNECTION_FAILURE // dial failure
 * - HANDSHAKED_SUCCESS
 * - HANDSHAKE_FAILURE
 * - BLACKLIST
 * - DEBLACKLIST
 * */
module.exports.STAT_TYPES = {
  'CONNECTION_SUCCESS': 'CONNECTION_SUCCESS',
  'CONNECTION_FAILURE': 'CONNECTION_FAILURE',
  'HANDSHAKE_SUCCESS': 'HANDSHAKE_SUCCESS',
  'HANDSHAKE_FAILURE': 'HANDSHAKE_FAILURE',
  'BLACKLIST': 'BLACKLIST',
  'DEBLACKLIST': 'DEBLACKLIST',
};

// used by the main controller
// every runtime implements getType() method
module.exports.RUNTIME_TYPE = {
    CLI : 'cli',
    Core : 'core',
    Node : 'node',
    Ethereum : 'eth',
    JsonRpcApi : 'rpcApi'
};

/** All the notificatiosn that the MainController can handle */
module.exports.MAIN_CONTROLLER_NOTIFICATIONS = {
  DbRequest : 'dbreq'
};
/** IPC core message types
 * in /docs there is  a README called IPC_MESSAGES.md
 * describing each message
 * */
// all the different requests that can be made to Core via the Ipc client
module.exports.CORE_REQUESTS = {
  CORE_DB_READ_ACTION : 'CORE_DB_READ_ACTION', // internal for CoreRuntime
  GetRegistrationParams : 'GetRegistrationParams',
  IdentityChallenge : 'IdentityChallenge',
  GetTip : 'GetTip',
  GetTips : 'GetTips',
  GetAllTips : 'GetAllTips',
  GetAllAddrs : 'GetAllAddrs',
  GetDelta : 'GetDelta',
  GetDeltas : 'GetDeltas',
  GetContract : 'GetContract'
};
