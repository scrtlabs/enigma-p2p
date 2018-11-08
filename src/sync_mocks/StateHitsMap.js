const parallel = require('async/parallel');
const EventEmitter = require('events').EventEmitter;
const EnigmaContract = require('./EnigmaContractMock');

/** logic
 * IGNORING DB for now - all in memory
 * - addrs = eth.getAllAddrs()
 * - for each addr:
 * - - deltasNum = eth.getDeltasCount(addr)
 * - - for i in 0...deltasNum:
 * - - - deltaHash = getDeltaHash(addr,i)
 * **/
class HitMap {
  constructor() {
    this.map = {};
  }
  getContractState(addr) {
    if (addr in this._map) {
      return this._map[addr];
    } else {
      return null;
    }
  }
  getAllContractAddrs() {
    const addrs = [];
    for (let k=0; k<addrs.length; k++) {
      addrs.push(k);
    }
    return addrs;
  }
  getDeltasNum(addr) {
    if (this.getAllContractAddrs(addr)) {
      return this._map[addr].length;
    }
    return null;
  }
  addContract(addr, deltasNum) {
    const contractState =this.getContractState(addr);

    if (contractState) {
      return false;
    } else {
      this._map[addr] = new Array(deltasNum);
      return true;
    }
  }
  addContractHit(addr, hash) {
    if (this.getContractState(addr)) {
      this._map[addr][0] = hash;
      return true;
    }
    return false;
  }
  addDeltaHit(addr, idx, hash) {
    if (this.getContractState(addr)) {
      this._map[addr][idx] = hash;
      return true;
    }
    return false;
  }
  mapAsList() {
    const list = [];
    Object.keys(this.map).forEach(function(key) {
      list.push(map[key]);
    });
    return list;
  }
}

class StateHitsMapManager extends EventEmitter {
  constructor(oldHitsMap) {
    super();
    this._enigmaContract = new EnigmaContract();
  }
  buildHitMap() {
    this.markHitMapDeltas((err, hitMap)=>{
      console.log('got hit map.');
    });
  }
  markHitMapDeltas(callback) {
    this.createEmptyStateMap((hitMap)=>{
      const addrs = hitMap.getAllContractAddrs();
      const jobs = [];

      addrs.forEach((addr)=>{
        jobs.push((cb)=>{
          this._deltasGetterPerContract(addr,
              hitMap.getDeltasNum(addr),
              (err, results)=>{
                results.forEach((res)=>{
                  const index = res.index;
                  const address = res.address;
                  const deltaHash = res.deltaHash;

                  hitMap.addDeltaHit(address, index, deltaHash);
                });

                cb(err, hitMap);
              });
        });
      });

      parallel(jobs, (err, res)=>{
        callback(err, hitMap);
      });
    });
  }
  _deltasGetterPerContract(addr, deltasNum, callback) {
    const jobs = [];

    for (let i=0; i<deltasNum; ++i) {
      jobs.push((cb)=>{
        this._enigmaContract.getStateDeltaHash(addr, i,
            (err, hash)=>{
              cb(err, {
                'address': addr,
                'index': i,
                'deltaHash': hash,
              });
            });
      });
    }
    parallel(jobs, (err, results)=>{
      callback(err, results);
    });
  }
  getAllAddresses(callback) {
    this._enigmaContract.getContractAddresses((err, addrs)=>{
      callback(err, addrs);
    });
  }
  createEmptyStateMap(callback) {
    const hitMap = new HitMap();

    this.getAllAddresses((err, addrs)=>{
      if (err) throw err;

      const jobs = [];
      addrs.forEach((addr)=>{
        jobs.push((cb)=>{
          this._enigmaContract.countStateDeltas(addr,
              (err, num)=>{
                cb(err, {'address': addr, 'deltasNum': num});
              });
        });
      });
      parallel(jobs, (err, results)=>{
        if (err) throw err;

        results.forEach((result)=>{
          const addr = result.address;
          const deltasNum = result.deltasNum;
          hitMap.addContract(addr, deltasNum);
        });
        callback(hitMap);
      });
    });
  }
}


const hitsManager = new StateHitsMapManager();
hitsManager.buildHitMap();


