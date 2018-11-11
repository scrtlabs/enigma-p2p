/**
 * This can fail.
 * Given an input:
 * - Missing deltas
 * - CID's and ProviderList for EACH CID (FindProviderResult.js)
 * Fetch from the providers all the bytecode/deltas
 * */
class TryReceiveAllAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let findProvidersResult = params.findProvidersResult;
    //TODO:: define missingStates created by IdentifyMissingStatesAction action
    let missingStates = params.missingStates;
    /**
     * For each CID:
     *  - for each Provider:
     *    - success = trySyncAllStates
     *    - if success:
     *      - save to db
     *      - break
     *    - else:
     *      - blacklist Provider && try NextProvider
     * */
    // this.receiver().startStateSyncRequest(providers[0], ['addr1','addr2']);

  }
}
