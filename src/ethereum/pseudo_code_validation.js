// local missing states
// input
// [{address,key,delta},...]}
// output
// let mockMissing = [
//   {address : addr1, deltas : [{deltaHash : 'hash1_0',index:0},{deltaHash : 'hash1_1',index:1},{deltaHash : 'hash1_2',index:2}]},
//   {address : addr2, deltas : [{deltaHash : 'hash2_0',index:0}]},
//   {address : addr3, deltas : [{deltaHash : 'hash3_0',index:0},{deltaHash : 'hash3_1',index:1}]},
// ];
//
// const parallel = require('async/parallel');
//
// /** Pseudo code for getting missing states */
// async function getMissingStates(eth,localTips,callback){
//   let remoteAddrsNum = await eth.countSecretContracts();
//   let allRemoteAddrs = await eth.getSecretContractAddresses(0,remoteAddrsNum);
//   let remoteDeltaNums = [];
//   // get the number of all deltas for each contract in remote
//   // initiate jobs
//   let jobs = [];
//   allRemoteAddrs.forEach(addr=>{
//     jobs.push((cb)=>{
//       eth.countStateDeltas(addr)
//       .then(size=>{
//         cb(null,{address: addr, deltaSize : size});
//       });
//     });
//   });
//   //execute jobs
//   // each result : {address, deltaSize }
//   parallel(jobs,(err,results)=>{
//     // get all actual hashes
//     let jobs = [];
//     results.forEach(res=>{
//       // init jobs
//       jobs.push(cb=>{
//         let addr = res.address;
//         let deltaSize = res.deltaSize;
//         // get local tip index:
//         let fromIndex = localTips.get(addr) | 0;
//         eth.getStateDeltaHashes(addr, fromIndex, deltaSize)
//         .then(deltasArray=>{
//           let parsedDeltasArray = [];
//           deltasArray.forEach((d,index,arr)=>{
//             parsedDeltasArray.push({deltaHash : d, index : index + fromIndex});
//           });
//           cb(null,{address : addr, deltas : parsedDeltasArray});
//         });
//       });
//       //execute jobs
//       parallel(jobs,(err,results)=>{
//         //DONE results == [{address, deltas : [deltaHash, index]}]
//         callback(results);
//       });
//     });
//   });
// }
//
// function asyncGetMissingStates(eth,localTips){
//   return new Promise((resolve,reject)=>{
//     getMissingStates(eth,localTips,(err,result)=>{
//       if(err){
//         reject(err);
//       }else{
//         resolve(result);
//       }
//     }).catch(e=>{
//       reject(e);
//     });
//   });
// }
