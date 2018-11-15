var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};

// const EnigmaToken = artifacts.require('EnigmaToken.sol');
// const Enigma = artifacts.require('Enigma.sol');

// module.exports = function(deployer) {
//   return deployer.then(() => {
//     return deployer.deploy(EnigmaToken);
//   }).then(() => {
//     const principal = '0x627306090abab3a6e1400e9345bc60c78a8bef57';
//     console.log('using account', principal, 'as principal signer');
//     return deployer.deploy(Enigma, EnigmaToken.address, principal);
//   });
// };
