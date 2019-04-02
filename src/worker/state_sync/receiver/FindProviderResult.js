

class FindProviderResult {
  constructor() {
    this._map = {};
    this._errored = {};
    this._completeError = false;
  }
  setCompleteError() {
    this._completeError = true;
  }
  /**
   * add a new mapping
   * @param {EngCID} engCid
   * @param {Array<PeerInfo>} providerList
   */
  addProviderResult(engCid, providerList) {
    const key = engCid.getKeccack256();
    this._map[key] = {providers: providerList, ecid: engCid};
  }
  addErroredProviderResult(engCid, error) {
    const key = engCid.getKeccack256();
    this._errored[key] = {ecid: engCid, error: error};
  }
  /**
   * indicates if there was a general error in the process - the _map will be empty in that case
   * @return {boolean}
   */
  isCompleteError() {
    return this._completeError;
  }
  /**
   * indicates if some of the registries has error
   * @return {boolean}
   */
  isErrors() {
    if (Object.keys(this._errored).length > 0) {
      return true;
    } else {
      return false;
    }
  }
  getProvidersMap() {
    return this._map;
  }
  getProvidersFor(ecid) {
    const key = ecid.getKeccack256();
    if (this._map[key]) {
      return this._map[key].providers;
    }
    return null;
  }
  /** the keys are the keccack hash of each ecid
   * @return {Array<string>}*/
  getKeysList() {
    return Object.keys(this._map);
  }
}

module.exports = FindProviderResult;


