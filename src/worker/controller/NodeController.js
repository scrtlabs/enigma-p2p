/** The P2P Facade
 * - addPeer/s
 * - dropPeer/s
 * - setNetworkId
 * - getNetworkDetails
 * - getPeerDetails
 * - setBootstrapPeers
 * - ...TBD
 * */
const errors = require('../../common/errors');
const constants = require('../../common/constants');
const TOPICS = constants.PUBSUB_TOPICS;
const NOTIFICATION = constants.NODE_NOTIFICATIONS;
const nodeUtils = require('../../common/utils');
const WorkerBuilder = require('../builder/WorkerBuilder');
const Provider = require('../../worker/state_sync/provider/Provider');
const Receiver = require('../../worker/state_sync/receiver/Receiver');
const ConnectionManager = require('../handlers/ConnectionManager');
const Stats = require('../Stats');
const Logger = require('../../common/logger');
const Policy = require('../../policy/policy');
const PersistentStateCache = require('../../db/StateCache');
const TaskManager = require('../tasks/TaskManager');
const PrincipalNode = require('../handlers/PrincipalNode');
// actions
const InitWorkerAction = require('./actions/InitWorkerAction');
const PubsubPublishAction = require('./actions/PubsubPublishAction');
const PubsubSubscribeAction = require('./actions/PubsubSubscribeAction');
const GetRegistrationParamsAction = require('./actions/GetRegistrationParamsAction');
const NewTaskEncryptionKeyAction = require('./actions/NewTaskEncryptionKeyAction');
const SubscribeSelfSignKeyTopicPipelineAction = require('./actions/SubscribeSelfSignKeyTopicPipelineAction');
const GetStateKeysAction = require('./actions/GetStateKeysAction');
// connectivity
const AfterOptimalDHTAction = require('./actions/connectivity/AfterOptimalDHTAction');
const SendFindPeerRequestAction = require('./actions/connectivity/SendFindPeerRequestAction');
const HandshakeUpdateAction = require('./actions/connectivity/HandshakeUpdateAction');
const DoHandshakeAction = require('./actions/connectivity/DoHandshakeAction');
const BootstrapFinishAction = require('./actions/connectivity/BootstrapFinishAction');
const ConsistentDiscoveryAction = require('./actions/connectivity/ConsistentDiscoveryAction');
//tasks
const StartTaskExecutionAction = require('./actions/tasks/StartTaskExecutionAction');
const VerifyNewTaskAction = require('./actions/tasks/VerifyNewTaskAction');
const ExecuteVerifiedAction = require('./actions/tasks/ExecuteVerifiedAction');
const PublishTaskResultAction = require('./actions/tasks/PublishTaskResultAction');
const VerifyAndStoreResultAction = require('./actions/tasks/VerifyAndStoreResultAction');
// db
const DbRequestAction = require('./actions/db/DbRequestAction');
const GetAllTipsAction = require('./actions/db/read/GetAllTipsAction');
const GetAllAddrsAction = require('./actions/db/read/GetAllAddrsAction');
const GetDeltasAction = require('./actions/db/read/GetDeltasAction');
const GetContractCodeAction = require('./actions/db/read/GetContractCodeAction');
const UpdateDbAction = require('./actions/db/write/UpdateDbAction');
//sync related
const AnnounceLocalStateAction = require('./actions/sync/AnnounceLocalStateAction');
const IdentifyMissingStatesAction = require('./actions/sync/IdentifyMissingStatesAction');
const ProvideStateSyncAction = require('./actions/sync/ProvideSyncStateAction');
const FindContentProviderAction = require('./actions/sync/FindContentProviderAction');
const GetLocalTipsOfRemote = require('./actions/sync/GetLocalTipsOfRemote');
const TryReceiveAllAction = require('./actions/sync/TryReceiveAllAction');
const ReceiveAllPipelineAction = require('./actions/sync/ReceiveAllPipelineAction');
const AnnounceContent = require('./actions/sync/AnnounceContent');
// gateway jsonrpc
const ProxyRequestDispatcher = require('./actions/proxy/ProxyDispatcherAction');
const RouteRpcBlockingAction = require('./actions/proxy/RouteRpcBlockingAction');
const RouteRpcNonBlockingAction = require('./actions/proxy/RouteRpcNonBlockingAction');
class NodeController {
  constructor(enigmaNode, protocolHandler, connectionManager, logger, extraConfig) {
    this._policy = new Policy();
    // extra config (currently dbPath for taskManager)
    this._extraConfig = extraConfig;
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

    // TODO:: taskManager see this._initTaskManager()
    this._taskManager = null;

    // // init ethereum api
    this._enigmaContractHandler = null;

    // init logic
    this._initController();
    // actions
    this._actions = {
      [NOTIFICATION.NEW_TASK_INPUT_ENC_KEY]: new NewTaskEncryptionKeyAction(this), // new encryption key from core jsonrpc response
      [NOTIFICATION.INIT_WORKER]: new InitWorkerAction(this), // https://github.com/enigmampc/enigma-p2p#overview-on-start
      [NOTIFICATION.PUBSUB_PUB]: new PubsubPublishAction(this),
      [NOTIFICATION.PUBSUB_SUB]: new PubsubSubscribeAction(this),
      [NOTIFICATION.REGISTRATION_PARAMS]: new GetRegistrationParamsAction(this), // reg params from core
      [NOTIFICATION.SELF_KEY_SUBSCRIBE]: new SubscribeSelfSignKeyTopicPipelineAction(this), // the responder worker from the gateway request on startup of a worker for jsonrpc topic
      [NOTIFICATION.GET_STATE_KEYS]: new GetStateKeysAction(this), // Make the PTT process
      // connectivity
      [NOTIFICATION.PERSISTENT_DISCOVERY_DONE]: new AfterOptimalDHTAction(this),
      [NOTIFICATION.FIND_PEERS_REQ]: new SendFindPeerRequestAction(this), // find peers request message
      [NOTIFICATION.HANDSHAKE_UPDATE]: new HandshakeUpdateAction(this),
      [NOTIFICATION.DISCOVERED]: new DoHandshakeAction(this),
      [NOTIFICATION.BOOTSTRAP_FINISH]: new BootstrapFinishAction(this),
      [NOTIFICATION.CONSISTENT_DISCOVERY]: new ConsistentDiscoveryAction(this),
      // tasks
      [NOTIFICATION.RECEIVED_NEW_RESULT]: new VerifyAndStoreResultAction(this), // very tasks result published stuff and store local
      [NOTIFICATION.TASK_FINISHED]: new PublishTaskResultAction(this), // once the task manager emits end event
      [NOTIFICATION.TASK_VERIFIED]: new ExecuteVerifiedAction(this), // once verified, pass to core the task/deploy
      [NOTIFICATION.START_TASK_EXEC]: new StartTaskExecutionAction(this), // start task execution (worker)
      [NOTIFICATION.VERIFY_NEW_TASK]: new VerifyNewTaskAction(this), // verify new task
      // db
      [NOTIFICATION.DB_REQUEST]: new DbRequestAction(this), // all the db requests to core should go through here.
      [NOTIFICATION.GET_ALL_TIPS]: new GetAllTipsAction(this),
      [NOTIFICATION.GET_ALL_ADDRS]: new GetAllAddrsAction(this), // get all the addresses from core or from cache
      [NOTIFICATION.GET_DELTAS]: new GetDeltasAction(this), // get deltas from core
      [NOTIFICATION.GET_CONTRACT_BCODE]: new GetContractCodeAction(this), // get bytecode
      [NOTIFICATION.UPDATE_DB]: new UpdateDbAction(this), // write to db, bytecode or delta
      // sync
      [NOTIFICATION.STATE_SYNC_REQ]: new ProvideStateSyncAction(this), // respond to a content provide request
      [NOTIFICATION.FIND_CONTENT_PROVIDER]: new FindContentProviderAction(this), // find providers of cids in the ntw
      [NOTIFICATION.IDENTIFY_MISSING_STATES_FROM_REMOTE]: new IdentifyMissingStatesAction(this),
      [NOTIFICATION.TRY_RECEIVE_ALL]: new TryReceiveAllAction(this), // the action called by the receiver and needs to know what and from who to sync
      [NOTIFICATION.ANNOUNCE_LOCAL_STATE]: new AnnounceLocalStateAction(this),
      [NOTIFICATION.SYNC_RECEIVER_PIPELINE]: new ReceiveAllPipelineAction(this), // sync receiver pipeline
      [NOTIFICATION.GET_REMOTE_TIPS] : new GetLocalTipsOfRemote(this), // get the local tips of a remote peer
      [NOTIFICATION.ANNOUNCE_ENG_CIDS] : new AnnounceContent(this), // announce some general content given cids, async
      // jsonrpc related
      [NOTIFICATION.PROXY]: new ProxyRequestDispatcher(this), // dispatch the requests proxy side=== gateway node
      [NOTIFICATION.ROUTE_BLOCKING_RPC]: new RouteRpcBlockingAction(this), // route a blocking request i.e getRegistrationParams, getStatus
      [NOTIFICATION.ROUTE_NON_BLOCK_RPC]: new RouteRpcNonBlockingAction(this), // routing non blocking i.e deploy/compute
    };
  }
  /**
   * Static method a quick node builder to initiate the Controller with a template built in.
   * Example:
   *  let nodeController = NodeController.initDefaultTemplate({'port':'30103'},'/path/to/config.json')
   *  nodeController.start();
   * @param {JSON} options
   * @param {Logger} logger
   * @return {NodeController}
   */
  static initDefaultTemplate(options, logger) {
    let path = null;
    if (options.configPath) {
      path = options.configPath;
    }
    // with default option (in constants.js)
    // const logger = new Logger({pretty:true});
    let _logger = null;
    if (logger) {
      _logger = logger;
    } else {
      _logger = new Logger();
    }
    const config = WorkerBuilder.loadConfig(path);
    const finalConfig = nodeUtils.applyDelta(config, options);
    const enigmaNode = WorkerBuilder.build(finalConfig, _logger);

    // create ConnectionManager
    const connectionManager = new ConnectionManager(enigmaNode, _logger);
    // create the controller instance
    return new NodeController(enigmaNode, enigmaNode.getProtocolHandler(), connectionManager, _logger, options.extraConfig);
  }
  _initController() {
    this._initPrincipalNode();
    this._initEnigmaNode();
    this._initConnectionManager();
    this._initProtocolHandler();
    this._initContentProvider();
    this._initContentReceiver();
    this._initTaskManager();
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
  /**
   * TODO:: currently it will generate db only if extraConfig provided
   * TODO:: beucase of tests and multiple instances and path collision.
   * */
  _initTaskManager() {
    if (this._extraConfig && this._extraConfig.tm && this._extraConfig.tm.dbPath) {
      const dbPath = this._extraConfig.tm.dbPath;
      this._taskManager = new TaskManager(dbPath, this.logger());
      this._taskManager.on('notify', (params)=>{
        const notification = params.notification;
        const action = this._actions[notification];
        if (action !== undefined) {
          this._actions[notification].execute(params);
        }
      });
    }
  }
  _initCache() {
    // TODO:: start the cache service
    // this._cache.start()
  };
  _initPrincipalNode() {
    let conf = {};
    if (this._extraConfig) {
      conf = this._extraConfig.principal;
    }
    this._principal = new PrincipalNode(conf, this.logger());
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
    this._provider.on('notify', (params)=>{
      const notification = params.notification;
      const action = this._actions[notification];
      if (action !== undefined) {
        this._actions[notification].execute(params);
      }
    });
  }
  _initContentReceiver() {
    this._receiver = new Receiver(this._engNode, this._logger);
    this._receiver.on('notify', (params)=>{
      const notification = params.notification;
      const action = this._actions[notification];
      if (action !== undefined) {
        this._actions[notification].execute(params);
      }
    });
  }
  /** stop Ethereum, if needed
   * */
  async _stopEthereum() {
    if (this._enigmaContractHandler) {
      await this._enigmaContractHandler.destroy();
    }
  }
  /** *********************
   * public methods
   *********************/
  /** start the node */
  async start() {
    await this.engNode().syncRun();
  }
  /** replace existing or add new action
   * @param {string} name
   * @param {Action} action
   * */
  overrideAction(name, action) {
    this._actions[name] = action;
  }
  /** init worker processes
   * once this done the worker can start receiving task
   * i.e already registred and sync
   * should be called after start() method was called
   * @param {Function} callback - optinal , (err)=>{} once done
   * */
  initializeWorkerProcess(callback) {
    this._actions[NOTIFICATION.INIT_WORKER].execute({
      callback: callback,
    });
  }
  /** set Ethereum API
   * @param {EnigmaContractHandler} handler
   * */
  setEthereumApi(handler) {
    this._enigmaContractHandler = handler;
  }
  /** * stop the node */
  async stop() {
    await this.engNode().syncStop();
    await this._stopEthereum();
    if (this._taskManager && this._extraConfig.tm.dbPath) {
      await this._taskManager.asyncStopAndDropDb();
    }
  }
  /**
   * "Runtime Id" required method for the main controller
   * @return {String}
   * */
  type() {
    return constants.RUNTIME_TYPE.Node;
  }
  /**
   * Set the communication channel, required for the main controller
   * This communicator class is the communication with the main controller
   * and other components
   * @param {Communicator} communicator
   * */
  setChannel(communicator) {
    this._communicator = communicator;
    this._communicator.setOnMessage((envelop)=>{
      const action = this._actions[envelop.type()];
      if (action) {
        action.execute(envelop);
      } else {
        this._logger.error('[-] Err wrong type in NodeController: ' + envelop.type());
      }
    });
  }
  /** Get the main controller communicator
   * This is suppose to be used by the Actions that receive an envelop and need to reply.
   * @return {Communicator} _communicator
   * */
  communicator() {
    return this._communicator;
  }
  /** Get the cache object for the state tips and contracts that are stored locally.
   * @return {PersistentStateCache}
   * */
  cache() {
    return this._cache;
  }
  principal() {
    return this._principal;
  }
  taskManager() {
    return this._taskManager;
  }
  ethereum() {
    return this._enigmaContractHandler.api();
  }
  logger() {
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
  // ----------------- API Methods  ------------------ //
  execCmd(cmd, params) {
    if (this._actions[cmd]) {
      this._actions[cmd].execute(params);
    }
  }
  async asyncExecCmd(cmd, params) {
    return new Promise(async (resolve, reject)=>{
      if (this._actions[cmd]) {
        try {
          const result = await this._actions[cmd].asyncExecute(params);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new errors.ActionNameErr(`undefined asyncExecute for ${cmd}`));
      }
    });
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
  async getTopics() {
    return await this.engNode().getTopics();
  }
  getSelfB58Id(){
    return this.engNode().getSelfIdB58Str();
  }
  getSelfAddrs() {
    return this.engNode().getListeningAddrs();
  }
  /**
   * given id lookup a peer in the network
   * does not attempt to connect
   * @param {string} b58Id
   * @return {Promise<PeerInfo>} peerInfo
   * */
  async lookUpPeer(b58Id){
    try{
      return await this.engNode().lookUpPeer(b58Id);
    }catch(e){
      this._logger.error(`error looking up peer ${e}`);
      return null;
    }
  }
  async getLocalStateOfRemote(b58Id){
    try{
      return await this._actions[NOTIFICATION.GET_REMOTE_TIPS].execute({peerB58Id : b58Id});
    }catch(e){
      return null;
    }
  }
  getLocalTips() {
    return this.asyncExecCmd(NOTIFICATION.GET_ALL_TIPS, {useCache: false});
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
  // TODO:: read params from constants
  tryConsistentDiscovery(callback) {
    this._actions[NOTIFICATION['CONSISTENT_DISCOVERY']].execute({
      'delay': 500,
      'maxRetry': 10,
      'timeout': 100000,
      'callback': callback,
    });
  }
  /**
   * unsubscribe form a topic
   * @param {string} topic
   * @param {Function} reference to the topic_handler (MUST)
   *
   * */
  unsubscribeTopic(topic, handler) {
    this.engNode().unsubscribe(topic, handler);
  }
  /**
   * monitor some topic, simply prints to std whenever some peer publishes to that topic
   * @param {string} topic
   * */
  monitorSubscribe(topic) {
    this._actions[NOTIFICATION.PUBSUB_SUB].execute({
      topic: topic,
      onPublish: (msg)=>{
        const from = msg.from;
        const data = JSON.parse(msg.data);
        const out = '->MONITOR published on:' + topic + '\n->from: ' + from + '\n->payload: ' + JSON.stringify(data);
        this._logger.info(out);
      },
      onSubscribed: ()=>{
        this._logger.info('Monitor subscribed to [' + topic +']');
      },
    });
  }
  hasEthereum() {
    return this._enigmaContractHandler;
  }
  broadcast(content) {
    this.publish(TOPICS.BROADCAST, content);
  }
  publish(topic, message) {
    this._actions[NOTIFICATION.PUBSUB_PUB].execute({
      topic: topic,
      message: message,
    });
  }
  /** temp run self subscribe command */
  async selfSubscribeAction() {
    return new Promise((res, rej)=>{
      this._actions[NOTIFICATION.SELF_KEY_SUBSCRIBE].execute({onResponse: (err, signKey)=>{
        if (err) {
          return rej(signKey);
        } else {
          res(signKey);
        }
      }});
    });
  }
  /**
   * @return {Promise<string>} signingKey of the sub topic
   * */
  async getSelfSubscriptionKey() {
    return new Promise((res, rej)=>{
      this.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS,
          {onResponse: (err, regParams)=>{
            if (err) return rej(err);
            else return res(regParams.result.signingKey);
          }}
      );
    });
  }
  /** temp should delete - is connection (no handshake related simple libp2p
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
  /** TODO:: add this as cli api + in the cli dump it into a file.;
   * TODO:: good for manual testing
   * returns the current local tips
   * @param {Boolean} fromCache , if true => use cache , false=> directly from core
   * @param {Function} onResponse , (missingStates) =>{}
   * */
  getAllLocalTips(fromCache, onResponse) {
    this._actions[NOTIFICATION.GET_ALL_TIPS].execute({
      dbQueryType: constants.CORE_REQUESTS.GetAllTips,
      onResponse: onResponse,
      cache: fromCache,
    });
  }
  /** get the registration params from core
   * @param {Function} callback , (err,result)=>{}
   * Result object - {signingKey,report, signature}
   * */
  getRegistrationParams(callback) {
    this._actions[NOTIFICATION.REGISTRATION_PARAMS].execute({
      onResponse: (err, result)=>{
        callback(err, result);
      },
    });
  }
  async asyncGetRegistrationParams(callback) {
    return new Promise((res, rej)=>{
      this.getRegistrationParams((err, result)=>{
        if (err) rej(err);
        else res(result);
      });
    });
  }
  /**
   * identify and print to log the missing states
   * @{Function} callback , optional (err,missingStates)=>{}
   * */
  identifyMissingStates(callback) {
    this._actions[NOTIFICATION.IDENTIFY_MISSING_STATES_FROM_REMOTE].execute({
      cache: false,
      onResponse: (err, missingStatesMsgsMap) =>{
        if (callback) {
          return callback(err, missingStatesMsgsMap);
        }
        if (err) {
          return this._logger.error(' error identifying missing states : ' + err);
        }
        for (const ecidHash in missingStatesMsgsMap) {
          this._logger.debug('----------- contract --------------');
          const contractMsgs = missingStatesMsgsMap[ecidHash];
          for (let i=0; i<contractMsgs.length; ++i) {
            console.log('---- msg ----- ');
            console.log(contractMsgs[i].toPrettyJSON());
          }
        }
      },
    });
  }
  // TODO make it usable to execute this pipeline
  syncReceiverPipeline(callback) {
    this._actions[NOTIFICATION.SYNC_RECEIVER_PIPELINE].execute({
      cache: false,
      onEnd: (err, statusResult)=>{
        if (callback) {
          return callback(err, statusResult);
        }
        this._logger.debug('done receiving pipeline. err? ' + err);
      },
    });
  }
  /**
   * Announce the network the contents the worker is holding.
   * This will be used to route requests to this announcing node.
   * */
  tryAnnounce(callback) {
    // test_real_announce
    // AnnounceLocalStateAction
    this._actions[NOTIFICATION.ANNOUNCE_LOCAL_STATE].execute({
      cache: false,
      onResponse: (error, content)=>{
        if (callback) {
          return callback(error, content);
        } else if (error) {
          this._logger.error('failed announcing ' + error);
        } else {
          content.forEach((ecid)=>{
            this._logger.info('providing : ' + ecid.getKeccack256());
          });
        }
      },
    });
  }
  /** Find a list of providers for each ecid
   * @param {Array<EngCid>} ecids
   * @param {Function} callback (findProviderResult)=>{}
   * */
  findProviders(ecids, callback) {
    this._actions[NOTIFICATION.FIND_CONTENT_PROVIDER].execute({
      descriptorsList: ecids,
      isEngCid: true,
      next: (findProvidersResult)=>{
        callback(findProvidersResult);
      },
    });
  }
  /** promise based version of findProviders */
  asyncFindProviders(ecids){
    return new Promise((resolve,reject)=>{
      this.findProviders(ecids,(findProvidersResult)=>{
        resolve(findProvidersResult);
      });
    });
  }
}
module.exports = NodeController;
