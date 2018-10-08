const pickRandom = require('pick-random');
const Web3 = require('web3');
const web3 = new Web3();
const fs = require('fs');
const level = require('level');


function random(m, s) {
    let num = Math.round(m + 2.0 * s * (Math.random() + Math.random() + Math.random() - 1.5));
    if(num <= 0){
        num = 1;
    }
    return num;
}

function randomRange(min,max){
    return Math.round(Math.random() * (max - min) + min);
}

function generate_n_keccack256_hashes(n){
    let hashes = [];
    for(let i=0;i<n;++i){
        let h = web3.utils.sha3(Math.random() + i + '');
        hashes.push(h);
    }
    return hashes;
}

function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

function hexToBytes(hex){
    let b = Buffer.from(hex,"hex");
    return [...b];
}

function generateBytesBlob(size){

    let min = 0;
    let max = 256;

    let blob = [];

    for(let i =0;i<size;++i){
        let randByte = randomRange(min,max);
        blob.push(randByte);
    }

    return blob;
}



function generate_ethereum_state(contractsNum,meanDeltasNum,deltasDeviation){

    let ethereum_state = {};
    // generate secret contract addresses

    let contracts = [];

    for(let i=0;i<contractsNum;++i){
        let contractSize = randomRange(500,2500);
        let bytecode = generateBytesBlob(contractSize);
        let bytecodeHash = web3.utils.keccak256(bytecode);
        contracts.push({
            'code' : bytecode,
            'code_hash' : bytecodeHash
        });
    }

    contracts.forEach(contract=>{
        // generate deltas
        let deltas = [];
        let deltasNumber = random(meanDeltasNum,deltasDeviation);
        for(let i=0;i<deltasNumber;++i){
            let deltaSize = randomRange(300,600);
            let delta = generateBytesBlob(deltaSize);
            let deltaHash = web3.utils.keccak256(delta);
            deltas.push({
                'delta' : delta,
                'delta_hash' : deltaHash
            });
        }
      // append a new contract
        let contractAddress =  contract.code_hash;
        ethereum_state[contractAddress] = {
            'code' : contract.code,
            'code_hash' : contract.code_hash,
            'deltas' : deltas
        };
    });

    return ethereum_state;
}

//"/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/ethereum_blockchain.js"
function save_ethereum_state_as_js(path,ethereum_state){
    let content = JSON.stringify(ethereum_state);
    fs.writeFile(path,content, function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });

}

// let ethereum_state = {
//     'addr1' : {
//         'code': [],
//         'code_hash': '',
//         'deltas': [{'delta':[], 'delta_hash':''},{}]
//     }
// };

function generateEthereumState(){
    let contractsNum = 100;
    let meanDeltasPerContracts = 39;
    let deviationDeltas = 2;
    let ethState = generate_ethereum_state(contractsNum,meanDeltasPerContracts,deviationDeltas);
    let path = "/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/ethereum_blockchain.json";
    save_ethereum_state_as_js(path,ethState);
}

module.exports.loadEthState = function(path){
    let defaultPath = './ethereum_blockchain';
    if(path){
        defaultPath = path;
    }
    let dictionary = require(defaultPath);
    return dictionary;
};

function loadEthereumState(){
    let dictionary = require('./ethereum_blockchain');
    return dictionary;
}

function dictToList(dictionary){
    let list = [];
    for(let key in dictionary){
        list.push(dictionary[key]);
    }
    return list;
}


/*** database leveldb mock */

// let database_state = {
//     'addr as bytes' : [], // contract byte code
//     'addr||index as bytes' : [] // delta index bytes
// };

function pickRandomFromList (list, num){
    if(num <=0 || num >= list.length){
        return list;
    }
    return pickRandom(list,{count:num});
};

function contractByteAddrFromHash(h){
    h = h.slice(2,h.length);
    let b = hexToBytes(h);
    return b;
}

function intTo4BytesArr (num) {
    let arr = new Uint8Array([
        (num & 0xff000000) >> 24,
        (num & 0x00ff0000) >> 16,
        (num & 0x0000ff00) >> 8,
        (num & 0x000000ff)
    ]);
    return Array.from(arr);
}

function bytesArrToInt(bytesArr){
    let buf = Buffer.from(bytesArr);
    let r = buf.readInt32BE(0);
    return r;
}

function deltaKeyBytes(contractByteAddr, index){
    let indexBytes = intTo4BytesArr(index);
    let res = [];
    contractByteAddr.forEach(c=>{
        res.push(c);
    });
    indexBytes.forEach(c=>{
        res.push(c);
    });
    return res;
}

function deltaKeyBytesToTuple(byteKey){
    let addr = byteKey.slice(0,byteKey.length -4);
    addr = toHexString(addr);
    let index = byteKey.slice(byteKey.length-4, byteKey.length);
    index = bytesArrToInt(index);
    return {'address' : addr, 'index' : index};
}

function partialDBStateFromEthereum(ethereumState, contractsNumToTake, deltasNumToTake){

    let database = {};

    let ethList = dictToList(ethereumState);
    let chosenContracts = pickRandomFromList(ethList, contractsNumToTake);

    chosenContracts.forEach(contract=>{
        let deltas = contract.deltas;
        let chosenDeltas = [];

        for(let i =0; i< Math.min(deltas.length, deltasNumToTake); ++i){
            chosenDeltas.push({
                'delta' : deltas[i],
                'index' : i
            });
        }

        let contractByteAddr = contractByteAddrFromHash(contract.code_hash);

        // add contract bytecode
        console.log("added contract");
        database[[contractByteAddr]] =contract.code;

        // add deltas

        chosenDeltas.forEach(d=>{

            let deltaKey = deltaKeyBytes(contractByteAddr, d.index);
            console.log("added delta key " + deltaKey);
            database[[deltaKey]] =d.delta;

        });
    });

    return database;
}



//"/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/db_states.json"
function save_db_state_as(path,dbState){
    let content = JSON.stringify(dbState);
    fs.writeFile(path,content, function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
}


module.exports.loadDb = function(path){

    let defaultPath = './db_states';

    if(path){
        defaultPath = path;
    }
    let dictionary = require(defaultPath);
    return dictionary;
};

function loadDBState(){
    let dictionary = require('./db_states');
    return dictionary;
}

function saveDbStateToLevelDB(dbPath,dbState){
    var db = level(dbPath);

    for(key in dbState){
        db.put(key, dbState[key], (err)=>{
            if(err){
                console.log("error storing -> " + err);
            }else{
                console.log(".");
            }
        });
    }
}
// generate ethereum state

//generateEthereumState();


// db

// let ethState = loadEthereumState();
// let contracts = 26;//100
// let deltas = 19; // 39
// let db = partialDBStateFromEthereum(ethState, contracts, deltas );
// let p ='/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/db_states.json';
// save_db_state_as(p,db);

// save to level db
let dbState = loadDBState();
//let leveldbPath ='/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/mockdb1';
//saveDbStateToLevelDB(leveldbPath,dbState);
// console.log(dictToList(dbState).length);



/* verify stuff */

//
// let dbList = dictToList(db);
// console.log("len = " + dbList.length);
//
// let tuple = deltaKeyBytesToTuple([65,229,159,229,43,92,80,99,224,16,156,24,60,168,252,174,39,27,176,241,191,162,70,89,83,150,243,2,47,1,131,237,0,0,0,0]);
// console.log("-----");
// console.log(tuple.address);
// console.log(tuple.index);


















