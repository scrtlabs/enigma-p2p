// DB = {
//   'address' : {
//     bytecode : [0,0,0,0,0,...]
//     delta : [{
//       index : 11,
//       data : [243,56,66758,657876]
//     }]
//   }
// }

const DbUtil = require('../../common/DbUtils');
const ADDR_SIZE = 32;
const BCODE_SIZE = 1500;
const DELTA_SIZE = 450;

const fs = require('fs');

module.exports.saveToFile = (path,file)=>{
  console.log('11111111');
  return new Promise((res,rej)=>{
    console.log('222222222222222222');
    _saveToFile(path,file,(err)=>{
      console.log('555555555555555555')
      if(err){
        console.log('errrrrrrrrrrrrrrrrrrrrrrrrT')
        rej(err);
      }else{
        console.log('6666666666666666666666')
        res();
      }
    });
  });
};
function _saveToFile(path,file,callback){
  console.log('3333333333333333333333333')
  fs.writeFile(path, file, function(err) {
    console.log('4444444444444444444')
    callback(err);
  });
}
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
function generateHexAddress(){
  let byteAddr = [];
  for(let i=0;i<ADDR_SIZE;++i){
    byteAddr.push(getRandomInt(255));
  }
  return DbUtil.toHexString(byteAddr);
}
function generateByteCode(){
  let byteCode = [];
  for(let i=0;i<BCODE_SIZE;++i){
    byteCode.push(getRandomInt(255));
  }
  return byteCode;
}
function generateDelta(){
  let byteDelta = [];
  for(let i=0;i<DELTA_SIZE;++i){
    byteDelta.push(getRandomInt(255));
  }
  return byteDelta;
}
// generate a database
function generateData(contractsNum, deltasNum){
  let db= {};
  for(let i =0;i<contractsNum;++i){
    let contract = {};
    contract.address = generateHexAddress();
    contract.bytecode = generateByteCode();
    contract.deltas = [];
    for(let j=0;j<deltasNum;++j){
      let delta = {
        index : j,
        data : generateDelta()
      };
      contract.deltas.push(delta);
    }
    db[contract.address] = contract;
  }
  return db;
}
// generate partial database from a given database
function generatePartialData(db, contractsNum, deltasNum){
  let newDb = {};
  let addresses = Object.keys(db);
  for(let i=0; i<contractsNum; i++){
    let contract = db[addresses[i]];
    let newDeltas = [];
    for(let j=0;j<Math.min(deltasNum, contract.deltas.length);++j){
      newDeltas.push(contract.deltas[j]);
    }
    newDb[contract.address] = contract;
    newDb[contract.address].deltas = newDeltas;
  }
  return newDb;
}


/** how to generate data && save to file */
// let db = generateData(3, 3);
//let file = 'module.exports.DB_PROVIDER=' + JSON.stringify(db);
// const fs = require('fs');
//
// fs.writeFile('./here.js', file, function(err) {
//   if (err) {
//     return console.log(err);
//   }
//   console.log('The file was saved!');
// });
/** how to load the db*/
// let db2 = require('./here');
// console.log(db2.DB_PROVIDER);

/** how to generate a partial db from a given db */
// let db = generateData(3,3);
// let newDb = generatePartialData(db,2,1);

