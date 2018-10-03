const Logger = require('../../../common/logger');
const constants = require('../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;

class BootstrapFinishAction{

    constructor(controller){
        this._controller = controller;
    }

    execute(params){
        console.log("BOOTSTRAP WITH ALL DNS IS DONE.");
    }
}
module.exports = BootstrapFinishAction;