const EnigmaToken = artifacts.require('EnigmaToken.sol');
const SolRsaVerify = artifacts.require('./utils/SolRsaVerify.sol');
const SecretContractImpl = artifacts.require('./impl/SecretContractImpl.sol');

const PRINCIPAL_SIGNING_ADDRESS = '0x3078356633353161633136306365333763653066';
const EPOCH_SIZE = 10;

const Enigma = artifacts.require('Enigma.sol');
const WorkersImpl = artifacts.require('./impl/WorkersImpl.sol');
const PrincipalImpl = artifacts.require('./impl/PrincipalImpl.sol');
const TaskImpl = artifacts.require('./impl/TaskImpl.sol');

async function deployProtocol(deployer) {
  await Promise.all([
    deployer.deploy(EnigmaToken),
    deployer.deploy(SolRsaVerify),
    deployer.deploy(WorkersImpl),
    deployer.deploy(SecretContractImpl),
  ]);

  await Promise.all([
      TaskImpl.link('WorkersImpl', WorkersImpl.address),
      PrincipalImpl.link('WorkersImpl', WorkersImpl.address),
    ]);

  await Promise.all([
    deployer.deploy(TaskImpl),
    deployer.deploy(PrincipalImpl),
  ]);

  await Promise.all([
    Enigma.link('WorkersImpl', WorkersImpl.address),
    Enigma.link('PrincipalImpl', PrincipalImpl.address),
    Enigma.link('TaskImpl', TaskImpl.address),
    Enigma.link('SecretContractImpl', SecretContractImpl.address),
  ]);

  let principal = PRINCIPAL_SIGNING_ADDRESS;
  console.log('using account', principal, 'as principal signer');
  await deployer.deploy(Enigma, EnigmaToken.address, principal, EPOCH_SIZE);
}

async function doMigration(deployer) {
  await deployProtocol(deployer);
}

module.exports = function(deployer) {
  deployer.then(() => doMigration(deployer));
};
