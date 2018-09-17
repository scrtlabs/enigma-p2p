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
const CMD = constants.NCMD;
const EnigmaNode = require('../EnigmaNode');
const ConnectionManager = require('../handlers/ConnectionManager');
const WorkerBuilder = require('../builder/WorkerBuilder');
const nodeUtils = require('../../common/utils');

class NodeController{

    constructor(enigmaNode,protocolHandler,connectionManager){
        this._engNode = enigmaNode;
        this._connectionManager = connectionManager;
        this._protocolHandler = protocolHandler;
        // stats
        this._handshaked = {};

        this._initController();
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
            let cmd = params.cmd;
            let recieverPeerInfo = params.who;
            switch(cmd){
                case CMD['HANDSHAKE_UPDATE']:
                    console.log("handshaked with someone");
                    this._handshaked[recieverPeerInfo.id.toB58String()] = recieverPeerInfo;
                    break;
                case CMD['BOOTSTRAP_FINISH']:
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
            let cmd = params.cmd;
            params = params.params;
            switch(cmd){
                case CMD['DISCOVERED']:
                    this._connectionManager.handshake(params.peer,true);
                    break;
            }
        });
    }
    engNode(){
        return this._engNode;
    }
    isHandshaked(peerB58Id){
        if(peerB58Id in this._handshaked){
            return true;
        }
        return false;
    }
}
module.exports = NodeController;