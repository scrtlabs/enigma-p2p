
const constants = require('../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;

class AnnounceContentAction{

    constructor(controller){
        this._controller = controller;
    }

  execute(params) {
    const descriptorsList = params.descriptorsList;
    const isEngCid = params.isEngCid;
    this._controller.provider().provideContentsBatch(descriptorsList, isEngCid,(err, failedCids)=>{
      if (err) {
        console.log('[-] err %s couldnt provide at all. failed cids %s ', err, failedCids.length);
      } else {
        console.log('[+] success providing cids. there are failed %s cids  ', failedCids.length);
      }
    });
  }
}

module.exports = AnnounceContentAction;
