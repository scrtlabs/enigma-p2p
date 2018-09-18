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
        this._connectionManager.on('notify', (params)=>{
            let notification = params.notification;
            let recieverPeerInfo = params.who;
            switch(notification){
                case NOTIFICATION['HANDSHAKE_UPDATE']:
                    this._actions[NOTIFICATION['HANDSHAKE_UPDATE']].execute(params);
                    break;
                case NOTIFICATION['BOOTSTRAP_FINISH']:
                    console.log("BOOTSTRAPPING WITH DNS IS DONE -> READY TO SEEDS");
                    // start peerBank discovery
                    break;
            }
        });
    }
    _initEnigmaNode(){
        this._engNode.on('notify', (params)=>{
            console.log("UPDATE : " , params);
        });
    }
    _initProtocolHandler(){
        this._protocolHandler.on('notify',(params)=>{
            let notification = params.notification;
            switch(notification){
                case NOTIFICATION['DISCOVERED']:
                    params = params.params;
                    this._connectionManager.handshake(params.peer,true);
                    break;
                case NOTIFICATION['HANDSHAKE_UPDATE']:
                    this._actions[NOTIFICATION['HANDSHAKE_UPDATE']].execute(params);
                    break;
            }
        });
    }
    engNode(){
        return this._engNode;
    }
    stats(){
        return this._stats;
    }

}
module.exports = NodeController;