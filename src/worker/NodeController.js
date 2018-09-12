/** The P2P Facade
 * - addPeer/s
 * - dropPeer/s
 * - setNetworkId
 * - getNetworkDetails
 * - getPeerDetails
 * - setBootstrapPeers
 * - ...TBD
 * */

class NodeController{
    constructor(enigmaNode,connectionManager){
        this._engNode = enigmaNode;
        this._connectionManager = connectionManager;

        this._engNode.on('notify', (params)=>{
            console.log("UPDATE : " , params);
        });
        this._connectionManager.on('notify', (params)=>{
            console.log("UPDATE : " , params);
        });
    }

}
module.exports = NodeController;