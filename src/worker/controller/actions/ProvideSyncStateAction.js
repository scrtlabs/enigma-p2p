
const constants = require('../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;

class ProvideSyncStateAction{

    constructor(controller){
        this._controller = controller;
    }

    execute(params){
        let provider = this._controller.provider();
        let connectionStream = params.params.connection;
        provider.startStateSyncResponse(connectionStream);
    }
}
module.exports = ProvideSyncStateAction;