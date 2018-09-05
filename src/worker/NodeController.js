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
    }
    run(){
        return new Promise(async resolve=>{
            await this._engNode.syncRun();
        });
    }
}
module.exports = NodeController;