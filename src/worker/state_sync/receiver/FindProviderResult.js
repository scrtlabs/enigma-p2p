

class FindProviderResult{

    constructor(){
        this._map = {};
        this._errored = {};
        this._completeError = false;
    }
    setCompleteError(){
        this._completeError = true;
    }
    /** add a new mapping
     * @param {EngCID} engCID
     * @param {Array<PeerInfo> providerList}
     **/
    addProviderResult(engCid, providerList){
        let key = engCid.getKeccack256();
        this._map[key] = {providers : providerList, ecid : engCid};
    }
    addErroredProviderResult(engCid, error){
        let key = engCid.getKeccack256();
        this._errored[key] = {ecid : engCid , error : error };
    }
    /** indicates if there was a general error in the process - the _map will be empty in that case*/
    isCompleteError(){
        return this._completeError;
    }
    /** indicates if some of the registries has error */
    isErrors(){

        if(Object.keys(this._errored).length > 0){
            return true;
        }else{
            return false;
        }
    }
    getProvidersMap(){
        return this._map;
    }

}

module.exports = FindProviderResult;