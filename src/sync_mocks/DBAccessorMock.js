const dataGenerator = require('./DataGenerator');
const StateUtil = require('../common/DbUtils');
const level = require('level');


// let database_state = {
//     'addr as bytes' : [], // contract byte code
//     'addr||index as bytes' : [] // delta index bytes
// };


class DBAccessorMock{

    constructor(path){
        this._path = path;
    }

    /** h (contract hash)
     * idx (if given -> then its a delta request)
     * returns = byte array as a key compatible with the db keys
     * */
    static _toDbKey(h,idx){
        let addrBytes = StateUtil.hexToBytes(h);
        return StateUtil.toBytesKey(addrBytes,idx);
    }

    db(){
        return level(this._path);
    }

    close(db){
        db.close();
    }
    isExist(hash,index,callback){
        let key = DBAccessorMock._toDbKey(hash,index);

        this._isExist(key,callback);
    }
    static strToByteArray(value){
        return value.split(",").map(val=> parseInt(val));
    }
    _isExist(key,callback){
        this.db().get(key,(err,value)=>{
            if(err){
                callback(err);
            }else{
                value = DBAccessorMock.strToByteArray(value);
                callback(null,value);
            }
        });
    }

    create(hash,index,value,callback){
        let key = DBAccessorMock._toDbKey(hash,index);
        this._create(key,value,callback);
    }
    _create(key,value,callback){
        this._isExist(key,(noSuchValue,val)=>{
            if(noSuchValue) { // ok to write new value
                this.db().put(key,value,(err)=>{
                    callback(err);
                });
            }else{ // value exists
                callback("value exists cannot create");
            }
        });
    }
    get(hash,index,callback){
        let key = DBAccessorMock._toDbKey(hash,index);
        this._get(key,callback);
    }
    _get(key,callback){
        this._isExist(key,(err,val)=>{
            callback(err,val);
        });
    }
    update(hash,index,callback){
        let key = DBAccessorMock._toDbKey(hash,index);
        this._update(key,callback);
    }
    _update(key,value, callback){
        this._isExist(key,(notExist,value)=>{
            if(notExist){ // error, its update not create
                callback("cannot update not-existing value");
            }else{
                this.db().put(key,value,(err)=>{
                    callback(err);
                });
            }
        });
    }
    forceUpdate(hash,index,callback){
        let key = DBAccessorMock._toDbKey(hash,index);
        this._forceUpdate(key,callback);
    }
    _forceUpdate(key,value,callback){
        this.db().put(key,value,(err)=>{
            callback(err);
        });
    }
    delete(hash,index,callback){
        let key = DBAccessorMock._toDbKey(hash,index);
        this._delete(key,callback);
    }
    _delete(key, callback){
        this.db().del(key,(err)=>{
            callback(err);
        });
    }

    /** onResult(err,key) =>{}
     * error === true => end
     * err !== true && err => error
     */
    readAllKeysStream(onResult){
        this.db().createKeyStream()
            .on('data', (key)=>{
                key = DBAccessorMock.strToByteArray(key);
                onResult(null,key);
            })
            .on('error' ,(err)=>{
                onResult(err);
            })
            .on('end', ()=>{
                onResult(true);
            });
    }

}
module.exports = DBAccessorMock;

let p ='/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/mockdb1';
let db = new DBAccessorMock(p);


let h1 = "0xdced2aaa90baa8526b1759608af74b6d8d49ac26a78f6278bcf3a50ffd14bc7a";
let h2 = '0xc2d60d91af2e04abc299f6e0a4a10e948648c0ada43da0a7d3d721b81d62c0d1';
let h3 = '0xc59ae74876449fe5cd4fced420fedf86be624c6022781c36f333cd70708cc2b1';
let h4 ='0x3ae386d0ec7c00f32d87bbef1d4d8aaa5007953f63d2ba4a392ec0ce917e1230';
let h5 = '0x2ebed9df2dc65b8e56b266c06a8e6e2d0c72effa18c49bef6387218acba6579b';
let h6 = '0x8d4888cf8c6e3596b2538622297cb8a2b02effe99f838679604792a362533361';
let h7 ='0x2b04e957107ce02612fd8583f4eaa219697a4cdf98e680e0a68e86a858bc6d26';

// db.isExist(h4, 1 ,(err,value)=>{
//
//     if(err){
//         console.log(err);
//     }
//
//     console.log("value ");
//     value = value.split(",").map(val=> parseInt(val));
//     console.log(value);
//     let sha = StateUtil.kecckak256Hash(value);
//     console.log(sha);
//
// });

// db.readAllKeysStream((err,key)=>{
//     if(err && err !== true){
//         console.log("[Err] ", err);
//     }else if(err === true){
//         console.log("end stream! ");
//     }else{
//
//     }
// });



































