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
const NOTIFICATION = constants.NODE_NOTIFICATIONS;
const Provider = require('../../worker/state_sync/provider/Provider');
const Receiver = require('../../worker/state_sync/receiver/Receiver');
const ConnectionManager = require('../handlers/ConnectionManager');
const WorkerBuilder = require('../builder/WorkerBuilder');
const Stats = require('../Stats');
const nodeUtils = require('../../common/utils');
const Logger = require('../../common/logger');
const Policy = require('../../policy/policy');
const PersistentStateCache = require('../../db/StateCache');
const EngCid = require('../../common/EngCID');
// actions
const HandshakeUpdateAction = require('./actions/connectivity/HandshakeUpdateAction');
const DoHandshakeAction = require('./actions/connectivity/DoHandshakeAction');
const BootstrapFinishAction = require('./actions/connectivity/BootstrapFinishAction');
const ConsistentDiscoveryAction = require('./actions/connectivity/ConsistentDiscoveryAction');
const PubsubPublishAction = require('./actions/PubsubPublishAction');
const AfterOptimalDHTAction = require('./actions/connectivity/AfterOptimalDHTAction');
const ProvideStateSyncAction = require('./actions/sync/ProvideSyncStateAction');
const FindContentProviderAction = require('./actions/sync/FindContentProviderAction');
const SendFindPeerRequestAction = require('./actions/connectivity/SendFindPeerRequestAction');
const IdentifyMissingStatesAction = require('./actions/sync/IdentifyMissingStatesAction');
const TryReceiveAllAction = require('./actions/sync/TryReceiveAllAction');
const AnnounceLocalStateAction = require('./actions/sync/AnnounceLocalStateAction');
const DbRequestAction = require('./actions/sync/DbRequestAction');
const GetAllTipsAction = require('./actions/sync/GetAllTipsAction');
const GetAllAddrsAction = require('./actions/sync/GetAllAddrsAction');
const GetDeltasAction = require('./actions/sync/GetDeltasAction');
const GetContractCodeAction = require('./actions/sync/GetContractCodeAction');
const ReceiveAllPipelineAction = require('./actions/sync/ReceiveAllPipelineAction');

class NodeController {
  constructor(enigmaNode, protocolHandler, connectionManager, logger) {
    this._policy = new Policy();

    // initialize logger
    this._logger = logger;

    this._communicator = null;
    // init persistent cache
    // TODO:: currently it's ignored and not initialized _initStateCache()
    // this._cache = new PersistentStateCache('./some_db_name');

    this._engNode = enigmaNode;
    this._connectionManager = connectionManager;
    this._protocolHandler = protocolHandler;

    // TODO:: take Provider form CTOR - currently uses _initContentProvider()
    this._provider = null;
    // TODO:: take Receiver form CTOR - currently uses _initContentReceiver()
    this._receiver = null;

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
      [NOTIFICATION.FIND_CONTENT_PROVIDER]: new FindContentProviderAction(this), // find providers of cids in the ntw
      [NOTIFICATION.FIND_PEERS_REQ]: new SendFindPeerRequestAction(this), // find peers request message
      [NOTIFICATION.IDENTIFY_MISSING_STATES_FROM_REMOTE] : new IdentifyMissingStatesAction(this),
      [NOTIFICATION.GET_ALL_TIPS] : new GetAllTipsAction(this),
      [NOTIFICATION.TRY_RECEIVE_ALL] : new TryReceiveAllAction(this), // the action called by the receiver and needs to know what and from who to sync
      [NOTIFICATION.DB_REQUEST] : new DbRequestAction(this), // all the db requests to core should go through here.
      [NOTIFICATION.ANNOUNCE_LOCAL_STATE] : new AnnounceLocalStateAction(this),
      [NOTIFICATION.GET_ALL_ADDRS] : new GetAllAddrsAction(this),// get all the addresses from core or from cache
      [NOTIFICATION.GET_DELTAS] : new GetDeltasAction(this), // get deltas from core
      [NOTIFICATION.GET_CONTRACT_BCODE] : new GetContractCodeAction(this), // get bytecode
      [NOTIFICATION.SYNC_RECEIVER_PIPELINE] : new ReceiveAllPipelineAction(this) // sync receiver pipeline
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
  static initDefaultTemplate(options, logger) {
    // create EnigmaNode
    let path = null;

    if (options.configPath) {
      path = options.configPath;
    }

    // with default option (in constants.js)
    // const logger = new Logger({pretty:true});
    let _logger = null;
    if(logger){
      _logger = logger;
    }else{
      _logger = new Logger();
    }

    const config = WorkerBuilder.loadConfig(path);
    const finalConfig = nodeUtils.applyDelta(config, options);
    const enigmaNode = WorkerBuilder.build(finalConfig,_logger);

    // create ConnectionManager
    const connectionManager = new ConnectionManager(enigmaNode,_logger);

    // create the controller instance
    return new NodeController(enigmaNode, enigmaNode.getProtocolHandler(), connectionManager, _logger);
  }
  _initController() {
    this._initEnigmaNode();
    this._initConnectionManager();
    this._initProtocolHandler();
    this._initContentProvider();
    this._initContentReceiver();
    // this._initCache();
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
  _initCache(){
    //TODO:: start the cache service
    // this._cache.start()
  };
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
    this._provider.on('notify',(params)=>{
      const notification = params.notification;
      const action = this._actions[notification];
      if(action !== undefined){
        this._actions[notification].execute(params);
      }
    });
  }
  _initContentReceiver() {
    this._receiver = new Receiver(this._engNode, this._logger);
  }
  /***********************
   * public methods
   *********************/
  /** start the node */
  async start(){
    await this.engNode().syncRun();
  }
  /*** stop the node */
  async stop(){
    await this.engNode().syncStop();
  }
  /**
   * "Runtime Id" required method for the main controller
   * @returns {String}
   * */
  type(){
    return constants.RUNTIME_TYPE.Node;
  }
  /**
   * Set the communication channel, required for the main controller
   * This communicator class is the communication with the main controller
   * and other components
   * @param {Communicator} communicator
   * */
  setChannel(communicator){
    this._communicator = communicator;
    this._communicator.setOnMessage(envelop=>{
      let action = this._actions[envelop.type()];
      if(action){
        action.execute(envelop);
      }else{
        this._logger.error("[-] Err wrong type in NodeController: " + envelop.type());
      }
    });
  }
  /** Get the main controller communicator
   * This is suppose to be used by the Actions that receive an envelop and need to reply.
   * @returns {Communicator} _communicator
   * */
  communicator(){
    return this._communicator;
  }
  /** Get the cache object for the state tips and contracts that are stored locally.
   * @returns {PersistentStateCache}
   * */
  cache(){
    return this._cache;
  }
  logger(){
    return this._logger;
  }
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

    return this.engNode().getPeersInfoList(handshakedIds);
  }
  getAllInboundHandshakes() {
    const currentPeerIds = this.engNode().getAllPeersIds();

    const handshakedIds = this.stats().getAllActiveInbound(currentPeerIds);

    return this.engNode().getPeersInfoList(handshakedIds);
  }
  getAllPeerBank() {
    return this.connectionManager().getAllPeerBank();
  }
  //TODO:: read params from constants
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
  /**TODO:: add this as cli api + in the cli dump it into a file.;
   * TODO:: good for manual testing
   * returns the current local tips
   * @param {Boolean} fromCache , if true => use cache , false=> directly from core
   * @param {Function} onResponse , (missingStates) =>{}
   * */
  getAllLocalTips(fromCache, onResponse){
    this._actions[NOTIFICATION.GET_ALL_TIPS].execute({
      dbQueryType : constants.CORE_REQUESTS.GetAllTips,
      onResponse : onResponse,
      cache : fromCache
    });
  }
  // TODO:: $identify is good to see output and console. refactor command
  // TODO:: that a user can use to identify its missing states at any time.
  /** TEMP */
  identifyMissingStates(callback){
    this._actions[NOTIFICATION.IDENTIFY_MISSING_STATES_FROM_REMOTE].execute({
      cache : false,
      onResponse : (err , missingStatesMsgsMap) =>{
        if(callback){
          return callback(err,missingStatesMsgsMap);
        }
        console.log("err? " + err + " -> local tips final callback : ");
        for(let ecidHash in missingStatesMsgsMap){
          console.log(" ----------- contract 1 --------------------- ");
          let contractMsgs = missingStatesMsgsMap[ecidHash];
          for(let i=0;i<contractMsgs.length;++i){
            console.log("---- msg ----- ");
            console.log(contractMsgs[i].toPrettyJSON());
          }
        }
      }
    });
  }
  //TODO make it usable to execute this pipeline
  syncReceiverPipeline(){
    this._actions[NOTIFICATION.SYNC_RECEIVER_PIPELINE].execute({
      cache : false,
      onEnd : (err,statusResult)=>{
        console.log("cool? " + err);
      }
    });
  }
  //TODO:: make it real announce command
  tryAnnounce(){
    //test_real_announce
    // AnnounceLocalStateAction
    this._actions[NOTIFICATION.ANNOUNCE_LOCAL_STATE].execute({
      cache : false,
      onResponse : (error,content)=>{
        if(error){
          console.log("err providing!@!!!! " , error);
        }else{
          console.log("final success providing: ");
          content.forEach(ecid=>{
            console.log("providing => " + ecid.getKeccack256());
          });
        }
      }
    })
  }
}
module.exports = NodeController;
