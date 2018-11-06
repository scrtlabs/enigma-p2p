const DbApi = require('./LevelDbApi');
const DbKey = require('./DbKey');
const parallel = require('async/parallel');

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
        this._dbApi.open();
    }
    /** add a new address to the cache
     * @param {String} addres - secret contract address
     * @param {String} initialStateHash - hash of the delta 0
     * @param {Function} callback , (err)=>{}
     * */
    addAddress(address,initialStateHash,callback){
        this._dbApi.get(this._CONTRACTS_KEY,(err,addrsList)=>{
            let addrsObj = [];
            // update address
            if(!err){
                addrsObj = addrsList;
            }
            addrsObj.push(address);

            // store back
            this._dbApi.put(this._CONTRACTS_KEY,JSON.stringify(addrsObj),(err)=>{
                if(err){
                    callback(err);
                }else{
                    // add initial delta
                  this._dbApi.put(address,JSON.stringify({index : 0, hash: initialStateHash}),callback);
                }
            });
        });
    }
    /**
     * Update an EXISTING tip
     * @param {String} address - secret contract
     * @param {String} tipHash - hash of the tip
     * @param {Integer} tipIndex - delta index
     * @param {Function} callback - (err)=>{}
     * */
    updateTip(address,tipHash,tipIndex,callback){
        this._dbApi.get(address,(err,tip)=>{
            if(err){
                callback(err);
            }else{
                tip.index = tipIndex;
                tip.hash = tipHash;
                this._dbApi.put(address,JSON.stringify(tip),callback);
            }
        });
    }
    /** get Existing delta tip or err
     * TipObject => {index,hash}
     * if err -> no tip && no address in cache
     * @param {String} address - secret contract
     * @param {Function} callback - (err,tipObject)=>{}*/
    getTip(address,callback){
        this._dbApi.get(address,callback);
    }
    /** get all cached addrs
     * @param {Function} callback - (err,addressesList)=>{}*/
    getAllAddrs(callback){
        this._dbApi.get(this._CONTRACTS_KEY,(err,addrs)=>{
            callback(err,addrs);
        });
    }
    /** Get all the cached tips
     * @param {Function} callback - (err,CachedTipsList)=>{}
     * -> CachedTipsList == [{error, address,tip : {index,hash}},...] error inside is individual for a key
     * */
    getAllTips(callback){
        this.getAllAddrs((err,addrs)=>{
            if(err){
                callback(err);
            }else{
                let jobs = [];
                addrs.forEach(addr=>{
                    jobs.push((cb)=>{
                        this.getTip(addr,(err,tip)=>{
                            cb(null,{error : err, address : addr, tip : tip});
                        });
                    });
                });

                parallel(jobs,(err,tips)=>{
                    callback(err,tips);
                });
            }
        })
    }
}
module.exports = PersistentStateCache;

/** mini tests */

// let cache = new PersistentStateCache('./cache');
// let scAddr = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52944';
// let scAddr2 = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52945';
// let initialStateDelta = '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8';
// let initialStateDelta2 = '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac9';
// let stateDelta = '0x6d91615c65c0e8f861b0fbfce2d9897fb942293e341eda10c91a6912c4f32668';
// let deltaIdx = 1;
// let stateDelta2 = '0x6d91615c65c0e8f861b0fbfce2d9897fb942293e341eda10c91a6912c4f32669';
// let deltaIdx2 = 1;

// cache.addAddress(scAddr,initialStateDelta,(err)=>{
//     console.log("is err adding addr ? " + err);
//
//     cache.getTip(scAddr,(err,tip)=>{
//       console.log("is err get tip ? " + err);
//       console.log(tip);
//
//       cache.updateTip(scAddr,stateDelta,deltaIdx,(err)=>{
//         console.log("is err update tip ? " + err);
//
//             cache.getTip(scAddr,(err,tip)=> {
//               console.log("is err get tip ? " + err);
//               console.log(tip);
//             });
//
//             cache.addAddress(scAddr2,initialStateDelta2,(err)=>{
//                 console.log("err adding 2nd addr? " + err);
//                 cache.getAllAddrs((err,addrs)=>{
//                     console.log("err getting all addrs ? " + err);
//                     console.log(addrs);
//
//                     cache.getAllTips((err,tips)=>{
//                         console.log("err in getAllTips? " + err);
//                         console.log(tips);
//                     });
//
//                 });
//             });
//         });
//     });
// });
