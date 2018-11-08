/** The P2P Facade
 * - addPeer/s
 * - dropPeer/s
 * - setNetworkId
 * - getNetworkDetails
 * - getPeerDetails
 * - setBootstrapPeers
 * - ...TBD
 * */

const constants = require('../../common/constants');
const TOPICS = constants.PUBSUB_TOPICS;
// const STATUS = constants.MSG_STATUS;
const NOTIFICATION = constants.NODE_NOTIFICATIONS;
// const STAT_TYPES = constants.STAT_TYPES;
// const EnigmaNode = require('../EnigmaNode');
const Provider = require('../../worker/state_sync/provider/Provider');
const Receiver = require('../../worker/state_sync/receiver/Receiver');
const ConnectionManager = require('../handlers/ConnectionManager');
const WorkerBuilder = require('../builder/WorkerBuilder');
const Stats = require('../Stats');
const nodeUtils = require('../../common/utils');
const Logger = require('../../common/logger');
const Policy = require('../../policy/policy');

// api
// const P2PApi = require('./P2PApi');
// actions
const HandshakeUpdateAction = require('./actions/HandshakeUpdateAction');
const DoHandshakeAction = require('./actions/DoHandshakeAction');
const BootstrapFinishAction = require('./actions/BootstrapFinishAction');
const ConsistentDiscoveryAction = require('./actions/ConsistentDiscoveryAction');
const PubsubPublishAction = require('./actions/PubsubPublishAction');
const AfterOptimalDHTAction = require('./actions/AfterOptimalDHTAction');
const ProvideStateSyncAction = require('./actions/ProvideSyncStateAction');
const AnnounceContentAction = require('./actions/AnnounceContentAction');
const FindContentProviderAction = require('./actions/FindContentProviderAction');
const SendFindPeerRequestAction = require('./actions/SendFindPeerRequestAction');

class NodeController {
  constructor(enigmaNode, protocolHandler, connectionManager, logger) {
    this._policy = new Policy();

    // initialize logger
    this._logger = logger;

    this._engNode = enigmaNode;
    this._connectionManager = connectionManager;
    this._protocolHandler = protocolHandler;

    // TODO:: take Provider form CTOR - currently uses _initContentProvider()
    this._provider = null;
    // TODO:: take Receiver form CTOR - currently uses _initContentReceiver()
    this._receiver = null;
    // TODO:: take api from CTOR - currently uses _initP2PApi()
    // this._p2pApi = new P2PApi();

    // stats
    this._stats = new Stats();

    // init logic
    this._initController();

    // actions
    this._actions = {
      [NOTIFICATION.HANDSHAKE_UPDATE]: new HandshakeUpdateAction(this),
      [NOTIFICATION.DISCOVERED]: new DoHandshakeAction(this),
      [NOTIFICATION.BOOTSTRAP_FINISH]: new BootstrapFinishAction(this),
      [NOTIFICATION.CONSISTENT_DISCOVERY]: new ConsistentDiscoveryAction(this),
      [NOTIFICATION.PUBSUB_PUB]: new PubsubPublishAction(this),
      [NOTIFICATION.PERSISTENT_DISCOVERY_DONE]: new AfterOptimalDHTAction(this),
      [NOTIFICATION.STATE_SYNC_REQ]: new ProvideStateSyncAction(this), // respond to a content provide request
      [NOTIFICATION.CONTENT_ANNOUNCEMENT]: new AnnounceContentAction(this), // tell ntw what cids are available for sync
      [NOTIFICATION.FIND_CONTENT_PROVIDER]: new FindContentProviderAction(this), // find providers of cids in the ntw
      [NOTIFICATION.FIND_PEERS_REQ]: new SendFindPeerRequestAction(this), // find peers request message
      // (same during handshake but isolated)
    };
  }
  /**
   * Static method a quick node builder to initiate the Controller with a template built in.
   * Example:
   *  let nodeController = NodeController.initDefaultTemplate({'port':'30103'},'/path/to/config.json')
   *  nodeController.start();
   * @param {Json} options
   * @param {string} configPath
   * @return {NodeController}
   */
  static initDefaultTemplate(options, configPath) {
    // create EnigmaNode
    let path = null;

    if (configPath) {
      path = configPath;
    }

    // with default option (in constants.js)

    const logger = new Logger();

    const config = WorkerBuilder.loadConfig(path);
    const finalConfig = nodeUtils.applyDelta(config, options);
    const enigmaNode = WorkerBuilder.build(finalConfig);

    // create ConnectionManager
    const connectionManager = new ConnectionManager(enigmaNode);

    // create the controller instance
    return new NodeController(enigmaNode, enigmaNode.getProtocolHandler(), connectionManager, logger);
  }
  _initController() {
    this._initEnigmaNode();
    this._initConnectionManager();
    this._initProtocolHandler();
    this._initContentProvider();
    this._initContentReceiver();
    // this._initP2PApi();
  }
  _initConnectionManager() {
    this._connectionManager.addNewContext(this._stats);

    this._connectionManager.on('notify', (params)=>{
      const notification = params.notification;

      const action = this._actions[notification];

      if (action !== undefined) {
        this._actions[notification].execute(params);
      }
    });
  }
  _initEnigmaNode() {
    this._engNode.on('notify', (params)=>{
      this._logger.info('[+] handshake with ' + params.from() + ' done, #' + params.seeds().length + ' seeds.' );
    });
  }
  _initProtocolHandler() {
    this._protocolHandler.on('notify', (params)=>{
      const notification = params.notification;
      const action = this._actions[notification];

      if (action !== undefined) {
        this._actions[notification].execute(params);
      }
    });
  }
  _initContentProvider() {
    this._provider = new Provider(this._engNode, this._logger);
  }
  _initContentReceiver() {
    this._receiver = new Receiver(this._engNode, this._logger);
  }
  // _initP2PApi() {
  //   this._p2pApi.on('execCmd', (cmd, params)=>{
  //     this.execCmd(cmd, params);
  //   });
  //   this._p2pApi.on('addPeer', (maStr)=>{
  //     this.addPeer(maStr);
  //   });
  //   this._p2pApi.on('getSelfAddrs', (callback)=>{
  //     const addrs = this.getSelfAddrs();
  //     callback(addrs);
  //   });
  //   this._p2pApi.on('getAllOutboundHandshakes', (callback)=>{
  //     const oHs = this.getAllOutboundHandshakes();
  //     callback(oHs);
  //   });
  //   this._p2pApi.on('getAllInboundHandshakes', (callback)=>{
  //     const iHs = this.getAllInboundHandshakes();
  //     callback(iHs);
  //   });
  //   this._p2pApi.on('getAllPeerBank', (callback)=>{
  //     const pb = this.getAllPeerBank();
  //     callback(pb);
  //   });
  //   this._p2pApi.on('tryConsistentDiscovery', ()=>{
  //     this.tryConsistentDiscovery();
  //   });
  //   this._p2pApi.on('broadcast', (content)=>{
  //     this.broadcast(content);
  //   });
  //   /** temp */
  //   this._p2pApi.on('provideContent', ()=>{
  //     this.provideContent();
  //   });
  //   /** temp */
  //   this._p2pApi.on('findContent', ()=>{
  //     this.findContent();
  //   });
  //   /** temp */
  //   this._p2pApi.on('findContentAndSync', ()=>{
  //     this.findContentAndSync();
  //   });
  //   /** temp */
  //   this._p2pApi.on('isSimpleConnected', (nodeId)=>{
  //     this.isSimpleConnected(nodeId);
  //   });
  // }
  // p2pApi() {
  //   return this._p2pApi;
  // }
  engNode() {
    return this._engNode;
  }
  connectionManager() {
    return this._connectionManager;
  }
  stats() {
    return this._stats;
  }
  provider() {
    return this._provider;
  }
  receiver() {
    return this._receiver;
  }
  policy() {
    return this._policy;
  }
  // ----------------- API Methods  ------------------
  execCmd(cmd, params) {
    if (this._actions[cmd]) {
      this._actions[cmd].execute(params);
    }
  }
  addPeer(maStr) {
    nodeUtils.connectionStrToPeerInfo(maStr, (err, peerInfo)=>{
      const action = NOTIFICATION['DISCOVERED'];
      if (err) {
        this._logger.error('[-] Err: ' + err);
        return;
      } else {
        this.execCmd(action, {'params': {'peer': peerInfo}});
      }
    });
  }
  getSelfAddrs() {
    return this.engNode().getListeningAddrs();
  }
  getAllOutboundHandshakes() {
    const currentPeerIds = this.engNode().getAllPeersIds();

    const handshakedIds = this.stats().getAllActiveOutbound(currentPeerIds);

    const peersInfo = this.engNode().getPeersInfoList(handshakedIds);
    return peersInfo;
  }
  getAllInboundHandshakes() {
    const currentPeerIds = this.engNode().getAllPeersIds();

    const handshakedIds = this.stats().getAllActiveInbound(currentPeerIds);

    const peersInfo = this.engNode().getPeersInfoList(handshakedIds);
    return peersInfo;
  }
  getAllPeerBank() {
    return this.connectionManager().getAllPeerBank();
  }
  tryConsistentDiscovery(callback) {
    this._actions[NOTIFICATION['CONSISTENT_DISCOVERY']].execute({
      'delay': 500,
      'maxRetry': 10,
      'timeout': 100000,
      'callback': callback,
    });
  }
  broadcast(content) {
    this._actions[NOTIFICATION['PUBSUB_PUB']].execute({
      'topic': TOPICS.BROADCAST,
      'message': content,
    });
  }
  /** temp */
  announceContent() {
    const descriptorsList = ['addr1', 'addr2', 'addr3'];

    this._actions[NOTIFICATION.CONTENT_ANNOUNCEMENT].execute({
      descriptorsList: descriptorsList,
    });
  }
  /** temp */
  findContent() {
    const descriptorsList = ['addr1', 'addr2', 'addr3'];
    const onResult = (findProvidersResult)=>{
      console.log('---------------------- find providers ------------------------------ ');
      console.log(' is complete error ? ' + findProvidersResult.isCompleteError());
      console.log(' is some error ? ' + findProvidersResult.isErrors());
      const map = findProvidersResult.getProvidersMap();
      Object.keys(map).forEach(function(key) {
        console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^');
        console.log('cid ' + key);
        console.log('providers:' );
        map[key].providers.forEach((p)=>{
          const mas = [];
          p.multiaddrs.forEach((ma)=>{
            mas.push(ma.toString());
          });
          console.log(mas);
        });
        console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^');
      });
      console.log('---------------------- find providers ------------------------------ ');
    };
    this._actions[NOTIFICATION.FIND_CONTENT_PROVIDER].execute({
      descriptorsList: descriptorsList,
      next: onResult,
    });
  }
  /** temp */
  findContentAndSync() {
    const descriptorsList = ['addr1', 'addr2', 'addr3'];
    this.receiver().findProvidersBatch(descriptorsList, (findProvidersResult)=>{
      if (findProvidersResult.isErrors()) {
        throw new Error('failed finding providers there is some error');
      } else {
        const map = findProvidersResult.getProvidersMap();
        for (const key in map) {
          if (map.hasOwnProperty(key)) {
            // const ecid = map[key].ecid;
            const providers = map[key].providers;
            this.receiver().startStateSyncRequest(providers[0], ['addr1']);
            break;
          }
        }
      }
    });
  }
  /** temp - is connection (no handshake related simple libp2p
   * @param {string} nodeId
   */
  isSimpleConnected(nodeId) {
    const isConnected = this._engNode.isConnected(nodeId);
    console.log('Connection test : ' + nodeId + ' ? ' + isConnected);
  }
  /** get self Peer Book (All connected peers)
   * @return {Array}
   */
  getAllHandshakedPeers() {
    return this.engNode().getAllPeersInfo();
  }
  /** temp - findPeersRequest
   *  @param {PeerInfo} peerInfo,
   *  @param {Function} onResponse callback , (err,request, response)=>{}
   *  @param {Integer} maxPeers, optional, if empty or 0 will query for all peers
   */
  sendFindPeerRequest(peerInfo, onResponse, maxPeers) {
    this._actions[NOTIFICATION.FIND_PEERS_REQ].execute({
      peerInfo: peerInfo,
      onResponse: onResponse,
      maxPeers: maxPeers,
    });
  }
}
module.exports = NodeController;


