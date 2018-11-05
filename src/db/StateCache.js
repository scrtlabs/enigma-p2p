const DbApi = require('./LevelDbApi');
const DbKey = require('./DbKey');


class StateCacheBuilder {
    static getInMemoryCache(){

    }
    static getPersistentCache(){

    }
}

/**
 * The cache database structure:
 * 1) address => Tip{index:,hash:}
 *      - address: the secret contract
 *      - Tip: the most recent state delta
 * 2) contracts => [addr1, addr2 , addr3, ... ]
 *      - a list of all secret contract addresses for quick lookup
 * */
class PersistentStateCache {

    /** @param {String} cachePath, the path to the db
     * Will create or open existing*/
    constructor(cachePath){
        this._CONTRACTS_KEY = "contracts";
        this._dbApi = new DbApi(cachePath);
    }

    // addSecretContract(address, deltaTip){
    //   this._dbApi.get(this._CONTRACTS_KEY , (err,contractsList)=>{
    //       contractsList.push(address);
    //       this._dbApi.put(this._CONTRACTS_KEY);
    //   });
    // }
}

class InMemoryStateCache{
    constructor(){

    }
}
module.exports = PersistentStateCache;
