const dataGenerator = require('./DataGenerator');
const StateUtil = require('../common/StateUtils1');
const level = require('level');


// let database_state = {
//     'addr as bytes' : [], // contract byte code
//     'addr||index as bytes' : [] // delta index bytes
// };


class DBAccessorMock{

    constructor(path){
        if(path){
            this._path = path;
        }
    }

    /** h (contract hash)
     * idx (if given -> then its a delta request)
     * returns = byte array as a key compatible with the db keys
     * */
    static _toDbKey(h,idx){
        let addrBytes = StateUtil.hexToBytes(h);
        return StateUtil.toBytesKey(addrBytes,idx);
    }

}