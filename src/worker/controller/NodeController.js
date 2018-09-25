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
const STATUS = constants.MSG_STATUS;
const NOTIFICATION = constants.NODE_NOTIFICATIONS;
const STAT_TYPES = constants.STAT_TYPES;
const EnigmaNode = require('../EnigmaNode');
const ConnectionManager = require('../handlers/ConnectionManager');
const WorkerBuilder = require('../builder/WorkerBuilder');
const Stats = require('../Stats');
const nodeUtils = require('../../common/utils');

// actions
const HandshakeUpdateAction = require('./actions/HandshakeUpdateAction');
const DoHandshakeAction = require('./actions/DoHandshakeAction');
const BootstrapFinishAction = require('./actions/BootstrapFinishAction');

class NodeController{

    constructor(enigmaNode,protocolHandler,connectionManager){

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

        let config = WorkerBuilder.loadConfig(path);
        let finalConfig = nodeUtils.applyDelta(config,options);
        let enigmaNode = WorkerBuilder.build(finalConfig);

        // create ConnectionManager
        let connectionManager = new ConnectionManager(enigmaNode);

        // create the controller instance
        return new NodeController(enigmaNode,enigmaNode.getProtocolHandler(),connectionManager);

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
            console.log("[+] handshake with " + params.from() + " done, #" + params.seeds().length + " seeds." );
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
                console.log("[-] Err: " , err);
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
}
module.exports = NodeController;




