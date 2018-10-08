// const dataGenerator = require('./DataGenerator');
//
//
// // let ethereum_state = {
// //     'addr1' : {
// //         'code': [],
// //         'code_hash': '',
// //         'deltas': [{'delta':[], 'delta_hash':''},{}]
// //     }
// // };
//
//
//
// class EnigmaContractMockAccessor{
//
//
//
//     constructor(ethereumPath){
//
//         this._path ="/home/wildermind/WebstormProjects/enigma-p2p/src/sync_mocks/ethereum_blockchain.json";
//         this._inMemoryState = null;
//
//         if(ethereumPath){
//             this._path = ethereumPath;
//         }
//     }
//     getEthState(){
//         if(this._inMemoryState){
//             return this._inMemoryState;
//         }
//         return dataGenerator.loadEthState(this._path);
//     }
//     loadToMemory(){
//         this._inMemoryState = this.getEthState();
//     }
//
//     getContract(addr,callback){
//
//         this.isDeployed(addr,(deployed=>{
//             if(deployed){
//                 callback(null,this.getEthState()[addr]);
//             }else{
//                 callback(false);
//             }
//         }));
//
//     }
//
//     getDeltasObject(addr){
//         let contract =this.getContract(addr,());
//         if(contract){
//             return contract.deltas;
//         }
//         return null;
//     }
//     /** TODO :: should be same as EnigmaContract*/
//
//     getContractAddresses(callback){
//
//
//         let addrs = [];
//
//         let ethState = this.getEthState();
//
//         for(let key in ethState){
//             addrs.push(key);
//         }
//
//         callback(null,addrs);
//
//     }
//     /** same as EnigmaContract */
//     isDeployed(addr,callback){
//         let contract=  this.getEthState()[addr];
//         if(contract){
//             callback(true);
//         }else{
//             callback(false);
//         }
//     }
//     /** same as EnigmaContract */
//     getCodeHash(addr,callback){
//
//         let contract =this.getContract(addr);
//         if(contract){
//             callback(null,contract.code_hash);
//         }else{
//             callback("not a valid contract");
//         }
//     }
//     /** same as EnigmaContract */
//     countStateDeltas(addr,callback){
//
//         let deltas = this.getDeltasObject(addr);
//         if(deltas){
//             callback(null,deltas.length);
//         }else{
//             callback("not a valid delta");
//         }
//
//     }
//     /** same as EnigmaContract */
//     getStateDeltaHash(addr, index,callback){
//
//         let deltasObject = this.getDEltas(addr);
//
//         if(deltasObject && deltasObject.length < index){
//             callback(null,deltasObject[index].delta_hash);
//         }else{
//             callback("index to big or not deltas or no such contract");
//         }
//
//     }
//     /** same as EnigmaContract */
//
//     isValidDeltaHash(addr, stateDeltaHash,callback){
//
//         let deltasObj = this.getDeltasObject(addr);
//
//         if(deltasObj){
//
//             let result =  deltasObj.some(d=>{
//                 return d.delta_hash === stateDeltaHash;
//             });
//             callback(null,result);
//         }else{
//             callback("no such delta");
//         }
//     }
// }
//
//
//
//
//
//
//
// module.exports = EnigmaContractMockAccessor;
//
