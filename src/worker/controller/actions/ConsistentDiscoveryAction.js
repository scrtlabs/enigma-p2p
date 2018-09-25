const constants = require('../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;

class ConsistentDiscoveryAction{

    constructor(controller){
        this._controller = controller;
    }

    execute(params){
        this._controller.connectionManager().tryConnect((err,result)=>{
            if(err === "peer bank is empty"){
                this._controller.connectionManager().expandPeerBank((err,result)=>{
                    if(err){}
                    else{}
                });
            }else{
                // validate enough connections
            }
        });
    }
}
module.exports = ConsistentDiscoveryAction;