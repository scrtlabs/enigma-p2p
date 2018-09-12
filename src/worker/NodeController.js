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

        this._engNode.on('notify', (params)=>{
            console.log("UPDATE : " , params);
        });
        this._connectionManager.on('notify', (params)=>{
            switch(params.cmd){
                case CMD['HANDSHAKE_UPDATE']:
                    console.log("handshaked with someone");
                    break;
            }
        });
        this._protocolHandler.on('notify',(params)=>{
            switch(params.cmd){
                case CMD['DISCOVERED']:
                    this._connectionManager.handshake(params.peer,true);
                    break;
            }
        });
    }

}
module.exports = NodeController;