
const constants = require('../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;

class FindContentProviderAction{

    constructor(controller){
        this._controller = controller;
    }

  execute(params) {
    const descriptorsList = params.descriptorsList;
    const next = params.next;
    this._controller.receiver().findProvidersBatch(descriptorsList, (findProviderResult)=>{
      next(findProviderResult);
    });
  }
}

module.exports = FindContentProviderAction;
