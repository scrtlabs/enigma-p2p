/** The P2P Facade
 * - addPeer/s
 * - dropPeer/s
 * - setNetworkId
 * - getNetworkDetails
 * - getPeerDetails
 * - setBootstrapPeers
 * - ...TBD
 * */

const constants = require('../common/constants');
const STATUS = constants.MSG_STATUS;
const CMD = constants.NCMD;

class NodeController{

    constructor(enigmaNode,protocolHandler,connectionManager){
        this._engNode = enigmaNode;
        this._connectionManager = connectionManager;
        this._protocolHandler = protocolHandler;

        this._initController();
    }
    _initController(){
        this._initEnigmaNode();
        this._initConnectionManager();
        this._initProtocolHandler();
    }
    _initConnectionManager(){
        this._connectionManager.on('notify', (params)=>{
            let cmd = params.cmd;
            params = params.params;
            switch(cmd){
                case CMD['HANDSHAKE_UPDATE']:
                    console.log("handshaked with someone");
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
}
module.exports = NodeController;