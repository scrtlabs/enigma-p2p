const DbApi = require('./LevelDbApi');
const DbKey = require('./DbKey');

class PersistentStateCache {

    /** @param {String} cachePath, the path to the db
     * Will create or open existing*/
    constructor(cachePath){
        this._dbApi = new DbApi(cachePath);
    }

  /**
   * @param {DbKey} dbKey
   * @param {String} value, the hash of the data to store
   */
  store(dbKey,value,callback);
}

module.exports = PersistentStateCache;
