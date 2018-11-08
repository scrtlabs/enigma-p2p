// const Web3 = require('web3');
// const contract = require('truffle-contract');
//
// async function initWeb3(url){
//         let provider = new Web3.providers.HttpProvider(url);
//         let web3 = new Web3(provider);
//         let accounts = await web3.eth.getAccounts();
//         return {provider: provider, web3 : web3, accounts : accounts};
// }
//
//
//
// async function test(){
//     let w3Params = await initWeb3('http://localhost:9545');
//     let accounts = w3Params.accounts;
//     let web3 = w3Params.web3;
//     let provider = w3Params.provider;
//
//     console.log("accounts => " , accounts);
//
//
//     let EnigmaABI = require('./includes/build/Enigma');
//     let TokenABI = require('./includes/build/EnigmaToken');
//
//     let TokenContract = contract(TokenABI);
//     let EnigmaContract = contract(EnigmaABI);
//
//     EnigmaContract.setProvider(provider);
//     TokenContract.setProvider(provider);
//
//     let enigma =  EnigmaContract.at('0x345cA3e014Aaf5dcA488057592ee47305D9B3e10').then(instance=>{
//         console.log("hola");
//     });
//
//
// }
//
// test();
