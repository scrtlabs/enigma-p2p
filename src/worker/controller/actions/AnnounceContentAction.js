class AnnounceContentAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    const descriptorsList = params.descriptorsList;
    this._controller.provider().provideContentsBatch(descriptorsList, (err, failedCids)=>{
      if (err) {
        console.log('[-] err %s couldnt provide at all. failed cids %s ', err, failedCids.length);
      } else {
        console.log('[+] success providing cids. there are failed %s cids  ', failedCids.length);
      }
    });
  }
}

module.exports = AnnounceContentAction;
