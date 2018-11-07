const pickRandom = require('pick-random');
const Web3 = require('web3');
const web3 = new Web3();
const fs = require('fs');
const level = require('level');


function random(m, s) {
  let num = Math.round(m + 2.0 * s * (Math.random() + Math.random() + Math.random() - 1.5));
  if (num <= 0) {
    num = 1;
  }
  return num;
}

function randomRange(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

module.exports.generateNkeccack256Hashes = function(n) {
  const hashes = [];
  for (let i=0; i<n; ++i) {
    const h = web3.utils.sha3(Math.random() + i + '');
    hashes.push(h);
  }
  return hashes;
};

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function hexToBytes(hex) {
  const b = Buffer.from(hex, 'hex');
  return [...b];
}

function generateBytesBlob(size) {
  const min = 0;
  const max = 256;

  const blob = [];

  for (let i =0; i<size; ++i) {
    const randByte = randomRange(min, max);
    blob.push(randByte);
  }

  return blob;
}


function _generateEthereumState(contractsNum, meanDeltasNum, deltasDeviation) {
  const ethereumState = {};
  // generate secret contract addresses

  const contracts = [];

  for (let i=0; i<contractsNum; ++i) {
    const contractSize = randomRange(500, 2500);
    const bytecode = generateBytesBlob(contractSize);
    const bytecodeHash = web3.utils.keccak256(bytecode);
    contracts.push({
      'code': bytecode,
      'code_hash': bytecodeHash,
    });
  }

  contracts.forEach((contract)=>{
    // generate deltas
    const deltas = [];
    const deltasNumber = random(meanDeltasNum, deltasDeviation);
    for (let i=0; i<deltasNumber; ++i) {
      const deltaSize = randomRange(300, 600);
      const delta = generateBytesBlob(deltaSize);
      const deltaHash = web3.utils.keccak256(delta);
      deltas.push({
        'delta': delta,
        'delta_hash': deltaHash,
      });
    }
    // append a new contract
    const contractAddress = contract.code_hash;
    ethereumState[contractAddress] = {
      'code': contract.code,
      'code_hash': contract.code_hash,
      'deltas': deltas,
    };
  });

  return ethereumState;
}

// "/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/ethereum_blockchain.js"
function saveEthereumStateAsJs(path, ethereumState) {
  const content = JSON.stringify(ethereumState);
  fs.writeFile(path, content, function(err) {
    if (err) {
      return console.log(err);
    }

    console.log('The file was saved!');
  });
}

// let ethereum_state = {
//     'addr1' : {
//         'code': [],
//         'code_hash': '',
//         'deltas': [{'delta':[], 'delta_hash':''},{}]
//     }
// };

module.exports.generateEthereumState = function() {
  const contractsNum = 100;
  const meanDeltasPerContracts = 39;
  const deviationDeltas = 2;
  const ethState = _generateEthereumState(contractsNum, meanDeltasPerContracts, deviationDeltas);
  const path = '/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/ethereum_blockchain.json';
  saveEthereumStateAsJs(path, ethState);
};

module.exports.loadEthState = function(path) {
  let defaultPath = './ethereum_blockchain';
  if (path) {
    defaultPath = path;
  }
  const dictionary = require(defaultPath);
  return dictionary;
};

module.exports.loadEthereumState = function() {
  const dictionary = require('./ethereum_blockchain');
  return dictionary;
};

function dictToList(dictionary) {
  const list = [];
  Object.keys(dictionary).forEach(function(key) {
    list.push(dictionary[key]);
  });
  return list;
}

/** * database leveldb mock */

// let database_state = {
//     'addr as bytes' : [], // contract byte code
//     'addr||index as bytes' : [] // delta index bytes
// };

function pickRandomFromList(list, num) {
  if (num <=0 || num >= list.length) {
    return list;
  }
  return pickRandom(list, {count: num});
};

function contractByteAddrFromHash(h) {
  h = h.slice(2, h.length);
  const b = hexToBytes(h);
  return b;
}

function intTo4BytesArr(num) {
  const arr = new Uint8Array([
    (num & 0xff000000) >> 24,
    (num & 0x00ff0000) >> 16,
    (num & 0x0000ff00) >> 8,
    (num & 0x000000ff),
  ]);
  return Array.from(arr);
}

function bytesArrToInt(bytesArr) {
  const buf = Buffer.from(bytesArr);
  const r = buf.readInt32BE(0);
  return r;
}

function deltaKeyBytes(contractByteAddr, index) {
  const indexBytes = intTo4BytesArr(index);
  const res = [];
  contractByteAddr.forEach((c)=>{
    res.push(c);
  });
  indexBytes.forEach((c)=>{
    res.push(c);
  });
  return res;
}

module.exports.deltaKeyBytesToTuple = function(byteKey) {
  let addr = byteKey.slice(0, byteKey.length -4);
  addr = toHexString(addr);
  let index = byteKey.slice(byteKey.length-4, byteKey.length);
  index = bytesArrToInt(index);
  return {'address': addr, 'index': index};
};

module.exports.partialDBStateFromEthereum = function(ethereumState, contractsNumToTake, deltasNumToTake) {
  const database = {};

  const ethList = dictToList(ethereumState);
  const chosenContracts = pickRandomFromList(ethList, contractsNumToTake);

  chosenContracts.forEach((contract)=>{
    const deltas = contract.deltas;
    const chosenDeltas = [];

    for (let i =0; i< Math.min(deltas.length, deltasNumToTake); ++i) {
      chosenDeltas.push({
        'delta': deltas[i],
        'index': i,
      });
    }

    const contractByteAddr = contractByteAddrFromHash(contract.code_hash);

    // add contract bytecode
    console.log('added contract');
    database[[contractByteAddr]] =contract.code;

    // add deltas

    chosenDeltas.forEach((d)=>{
      const deltaKey = deltaKeyBytes(contractByteAddr, d.index);
      console.log('added delta key ' + deltaKey);
      database[[deltaKey]] =d.delta;
    });
  });

  return database;
};


// "/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/db_states.json"
module.exports.saveDbStateAs = function(path, dbState) {
  const content = JSON.stringify(dbState);
  fs.writeFile(path, content, function(err) {
    if (err) {
      return console.log(err);
    }

    console.log('The file was saved!');
  });
};


module.exports.loadDb = function(path) {
  let defaultPath = './db_states';

  if (path) {
    defaultPath = path;
  }
  const dictionary = require(defaultPath);
  return dictionary;
};

module.exports.loadDBState = function() {
  const dictionary = require('./db_states');
  return dictionary;
};

module.exports.saveDbStateToLevelDB = function(dbPath, dbState) {
  const db = level(dbPath);

  Object.keys(dbState).forEach(function(key) {
    db.put(key, dbState[key].delta, (err)=>{
      if (err) {
        console.log('error storing -> ' + err);
      } else {
        console.log('.');
      }
    });
  });
};
// generate ethereum state

// generateEthereumState();


// db

// let ethState = loadEthereumState();
// let contracts = 26;//100
// let deltas = 19; // 39
// let db = partialDBStateFromEthereum(ethState, contracts, deltas );
// let p ='/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/db_states.json';
// saveDbStateAs(p,db);

// save to level db
// const dbState = loadDBState();

// let k = [ 58, 227, 134, 208, 236, 124, 0, 243, 45, 135, 187, 239, 29, 77, 138, 170, 80, 7, 149,
//           63, 99, 210, 186, 74, 57, 46, 192, 206, 145, 126, 18, 48, 0, 0, 0, 1 ];
// console.log("333333")
// let val = dbState[k];
// console.log(dbState[k]);
// console.log("333333")

// let leveldbPath ='/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/mockdb1';
// saveDbStateToLevelDB(leveldbPath,dbState);
// console.log(dictToList(dbState).length);


/* verify stuff */

//
// let dbList = dictToList(db);
// console.log("len = " + dbList.length);
//
// let tuple = deltaKeyBytesToTuple([65,229,159,229,43,92,80,99,224,16,156,24,60,168,252,174,39,
//                                   27,176,241,191,162,70,89,83,150,243,2,47,1,131,237,0,0,0,0]);
// console.log("-----");
// console.log(tuple.address);
// console.log(tuple.index);


