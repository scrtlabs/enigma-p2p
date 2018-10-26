const DbApi = require('./LevelDbApi');


class StateCache {

    constructor(cachePath){
        this._dbApi = new DbApi(cachePath);
    }

    addDelta(addr,index,hash,callback){

    }

}