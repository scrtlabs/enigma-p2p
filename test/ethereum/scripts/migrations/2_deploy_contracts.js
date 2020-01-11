const EnigmaToken = artifacts.require("EnigmaToken.sol");
const SolRsaVerify = artifacts.require("./utils/SolRsaVerify.sol");
const SecretContractImpl = artifacts.require("./impl/SecretContractImpl.sol");
const ExchangeRate = artifacts.require("ExchangeRate.sol");
const UpgradeImpl = artifacts.require("./impl/UpgradeImpl.sol");

const PRINCIPAL_SIGNING_ADDRESS = "0x3078356633353161633136306365333763653066";
const ISVSVN = "0x0000";
const MRSIGNER = "0x83d719e77deaca1470f6baf62a4d774303c899db69020f9c70ee1dfc08c7ce9e";
const EPOCH_SIZE = 10;
const TIMEOUT_THRESHOLD = 2;
const DEBUG = false;

const Enigma = artifacts.require("Enigma.sol");
const WorkersImpl = artifacts.require("./impl/WorkersImpl.sol");
const PrincipalImpl = artifacts.require("./impl/PrincipalImpl.sol");
const TaskImpl = artifacts.require("./impl/TaskImpl.sol");

async function deployProtocol(deployer) {
  await Promise.all([
    deployer.deploy(EnigmaToken),
    deployer.deploy(SolRsaVerify),
    deployer.deploy(WorkersImpl),
    deployer.deploy(SecretContractImpl),
    deployer.deploy(UpgradeImpl)
  ]);

  await Promise.all([
    TaskImpl.link("WorkersImpl", WorkersImpl.address),
    PrincipalImpl.link("WorkersImpl", WorkersImpl.address)
  ]);

  await Promise.all([deployer.deploy(TaskImpl), deployer.deploy(PrincipalImpl)]);

  await Promise.all([
    Enigma.link("WorkersImpl", WorkersImpl.address),
    Enigma.link("PrincipalImpl", PrincipalImpl.address),
    Enigma.link("TaskImpl", TaskImpl.address),
    Enigma.link("UpgradeImpl", UpgradeImpl.address),
    Enigma.link("SecretContractImpl", SecretContractImpl.address)
  ]);

  let principal = PRINCIPAL_SIGNING_ADDRESS;
  console.log("using account", principal, "as principal signer");
  await deployer.deploy(ExchangeRate);
  await deployer.deploy(
    Enigma,
    EnigmaToken.address,
    principal,
    ExchangeRate.address,
    EPOCH_SIZE,
    TIMEOUT_THRESHOLD,
    DEBUG,
    MRSIGNER,
    ISVSVN
  );
}

async function doMigration(deployer) {
  await deployProtocol(deployer);
}

module.exports = function(deployer) {
  deployer.then(() => doMigration(deployer));
};
