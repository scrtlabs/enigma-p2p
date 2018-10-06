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
const STATUS = constants.MSG_STATUS;
const NOTIFICATION = constants.NODE_NOTIFICATIONS;
const STAT_TYPES = constants.STAT_TYPES;
const EnigmaNode = require('../EnigmaNode');
const ConnectionManager = require('../handlers/ConnectionManager');
const WorkerBuilder = require('../builder/WorkerBuilder');
const Stats = require('../Stats');
const nodeUtils = require('../../common/utils');
const Logger = require('../../common/logger');
const Policy = require('../../policy/policy');

// actions
const HandshakeUpdateAction = require('./actions/HandshakeUpdateAction');
const DoHandshakeAction = require('./actions/DoHandshakeAction');
const BootstrapFinishAction = require('./actions/BootstrapFinishAction');
const ConsistentDiscoveryAction = require('./actions/ConsistentDiscoveryAction');
const PubsubPublishAction = require('./actions/PubsubPublishAction');

class NodeController{

    constructor(enigmaNode,protocolHandler,connectionManager,logger){

        this._policy = new Policy();

        // initialize logger
        this._logger = logger;

        this._engNode = enigmaNode;
        this._connectionManager = connectionManager;
        this._protocolHandler = protocolHandler;

        // stats
        this._stats = new Stats();

        // init logic
        this._initController();

        // actions
        this._actions = {

            [NOTIFICATION['HANDSHAKE_UPDATE']] : new HandshakeUpdateAction(this),
            [NOTIFICATION['DISCOVERED']] : new DoHandshakeAction(this),
            [NOTIFICATION['BOOTSTRAP_FINISH']] : new BootstrapFinishAction(this),
            [NOTIFICATION['CONSISTENT_DISCOVERY']] : new ConsistentDiscoveryAction(this),
            [NOTIFICATION['PUBSUB_PUB']] : new PubsubPublishAction(this),

        };
    }
    /**
     * Static method a quick node builder to initiate the Controller with a template built in.
     * Example:
     *  let nodeController = NodeController.initDefaultTemplate({'port':'30103'},'/path/to/config.json')
     *  nodeController.start();
     * */
    static initDefaultTemplate(options,configPath){

        // create EnigmaNode
        let path = null;

        if(configPath)
            path = configPath;

        // with default option (in constats.js)

        let logger = new Logger();

        let config = WorkerBuilder.loadConfig(path);
        let finalConfig = nodeUtils.applyDelta(config,options);
        let enigmaNode = WorkerBuilder.build(finalConfig);

        // create ConnectionManager
        let connectionManager = new ConnectionManager(enigmaNode);

        // create the controller instance
        return new NodeController(enigmaNode,enigmaNode.getProtocolHandler(),connectionManager, logger);

    }
    _initController(){
        this._initEnigmaNode();
        this._initConnectionManager();
        this._initProtocolHandler();
    }
    _initConnectionManager(){

        this._connectionManager.addNewContext(this._stats);

        this._connectionManager.on('notify', (params)=>{
            let notification = params.notification;

            let action = this._actions[notification];

            if(action !== undefined){
                this._actions[notification].execute(params);
            }
        });
    }
    _initEnigmaNode(){
        this._engNode.on('notify', (params)=>{
            this._logger.info("[+] handshake with " + params.from() + " done, #" + params.seeds().length + " seeds." );
        });
    }
    _initProtocolHandler(){
        this._protocolHandler.on('notify',(params)=>{
            let notification = params.notification;
            let action = this._actions[notification];

            if(action !== undefined){
                this._actions[notification].execute(params);
            }

        });
    }
    engNode(){
        return this._engNode;
    }
    connectionManager(){
        return this._connectionManager;
    }
    stats(){
        return this._stats;
    }
    policy(){
        return this._policy;
    }
    /******************* API Methods  *******************/
    execCmd(cmd,params){
        if(this._actions[cmd]){
            this._actions[cmd].execute(params);
        }
    }
    addPeer(maStr){
        nodeUtils.connectionStrToPeerInfo(maStr,(err,peerInfo)=>{
            let action = NOTIFICATION['DISCOVERED'];
            if(err){
                this._logger.error("[-] Err: " + err);
                return;
            }else{
                this.execCmd(action,{"params": {"peer" :peerInfo }});
            }
        });
    }
    getSelfAddrs(){
        return this.engNode().getListeningAddrs();
    }
    getAllOutboundHandshakes(){
        let currentPeerIds = this.engNode().getAllPeersIds();

        let handshakedIds = this.stats().getAllActiveOutbound(currentPeerIds);

        let peersInfo = this.engNode().getPeersInfoList(handshakedIds);
        return peersInfo;
    }
    getAllInboundHandshakes(){
        let currentPeerIds = this.engNode().getAllPeersIds();

        let handshakedIds = this.stats().getAllActiveInbound(currentPeerIds);

        let peersInfo = this.engNode().getPeersInfoList(handshakedIds);
        return peersInfo;
    }
    getAllPeerBank(){
        return this.connectionManager().getAllPeerBank();
    }
    tryConsistentDiscovery(){
        this._actions[NOTIFICATION['CONSISTENT_DISCOVERY']].execute({
            "delay" : 500,
            "maxRetry" : 10,
            "timeout" : 100000,
        });
    }
    broadcast(content){

        this._actions[NOTIFICATION['PUBSUB_PUB']].execute({
            'topic' : TOPICS.BROADCAST,
            'message' : content
        });
    }

}
module.exports = NodeController;



