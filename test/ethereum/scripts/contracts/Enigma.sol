pragma solidity ^0.5.12;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./utils/SolRsaVerify.sol";

import { WorkersImpl } from "./impl/WorkersImpl.sol";
import { PrincipalImpl } from "./impl/PrincipalImpl.sol";
import { TaskImpl } from "./impl/TaskImpl.sol";
import { UpgradeImpl } from "./impl/UpgradeImpl.sol";
import { SecretContractImpl } from "./impl/SecretContractImpl.sol";
import { EnigmaCommon } from "./impl/EnigmaCommon.sol";
import { EnigmaState } from "./impl/EnigmaState.sol";
import { EnigmaEvents } from "./impl/EnigmaEvents.sol";
import { EnigmaStorage } from "./impl/EnigmaStorage.sol";
import { Getters } from "./impl/Getters.sol";
import { ERC20 } from "./interfaces/ERC20.sol";

contract Enigma is EnigmaStorage, EnigmaEvents, Getters, Ownable {
    using SafeMath for uint256;
    using SafeMath for uint64;
    using ECDSA for bytes32;

    // ========================================== Constructor ==========================================

    constructor(address _tokenAddress, address _principal, address _exchangeRate, uint _epochSize,
        uint _timeoutThreshold, bool _debug, bytes memory _mrSigner, bytes memory _isvSvn) public {
        state.engToken = ERC20(_tokenAddress);
        state.epochSize = _epochSize;
        state.taskTimeoutSize = _timeoutThreshold * state.epochSize;
        state.principal = _principal;
        state.exchangeRate = _exchangeRate;
        state.updatedEnigmaContractAddress = address(this);
        state.stakingThreshold = 1;
        state.workerGroupSize = 1;
        state.debug = _debug;
        state.mrSigner = _mrSigner;
        state.isvSvn = _isvSvn;
    }

    // ========================================== Modifiers ==========================================

    /**
    * Checks if the custodian wallet is not registered as a worker
    *
    * @param _user The custodian address of the worker
    */
    modifier workerUnregistered(address _user) {
        EnigmaCommon.Worker memory worker = state.workers[_user];
        require(worker.status == EnigmaCommon.WorkerStatus.Unregistered, "Registered worker");
        _;
    }

    /**
    * Checks if the custodian wallet is registered as a worker
    *
    * @param _user The custodian address of the worker
    */
    modifier workerRegistered(address _user) {
        EnigmaCommon.Worker memory worker = state.workers[_user];
        require(worker.status != EnigmaCommon.WorkerStatus.Unregistered, "Unregistered worker");
        _;
    }

    /**
    * Checks if staking address balance is 0
    *
    */
    modifier emptyBalance() {
        require(state.workers[state.stakingToOperatingAddresses[msg.sender]].balance == 0,
            "Worker's balance is not empty");
        _;
    }

    /**
    * Checks if the custodian wallet is logged in as a worker
    *
    */
    modifier workerLoggedIn() {
        EnigmaCommon.Worker memory worker = state.workers[msg.sender];
        require(worker.status == EnigmaCommon.WorkerStatus.LoggedIn, "Worker not logged in");
        _;
    }

    /**
    * Checks if the staking address or operating address is logged in
    *
    */
    modifier stakingOrOperatingAddressLoggedIn() {
        require((state.workers[msg.sender].status == EnigmaCommon.WorkerStatus.LoggedIn) ||
            state.workers[state.stakingToOperatingAddresses[msg.sender]].status == EnigmaCommon.WorkerStatus.LoggedIn,
            "Worker not logged in");
        _;
    }

    /**
    * Checks if the staking address or operating address is registered
    *
    */
    modifier stakingOrOperatingAddressRegistered() {
        require((state.workers[msg.sender].status != EnigmaCommon.WorkerStatus.Unregistered) ||
        state.workers[state.stakingToOperatingAddresses[msg.sender]].status != EnigmaCommon.WorkerStatus.Unregistered,
            "Unregistered worker");
        _;
    }

    /**
    * Checks if worker can log in
    *
    */
    modifier canLogIn() {
        EnigmaCommon.Worker memory worker = state.workers[msg.sender];
        // MOCK
        //require(getFirstBlockNumber(block.number) != 0, "Principal node has not been initialized");
        require(worker.status == EnigmaCommon.WorkerStatus.LoggedOut, "Worker not registered or not logged out");
        // MOCK
        //require(worker.balance >= state.stakingThreshold, "Worker's balance is not sufficient");
        _;
    }

    /**
    * Checks if the worker can withdraw
    *
    */
    modifier canWithdraw() {
        EnigmaCommon.Worker memory worker = state.workers[state.stakingToOperatingAddresses[msg.sender]];
        require(worker.status == EnigmaCommon.WorkerStatus.LoggedOut, "Worker not registered or not logged out");
        EnigmaCommon.WorkerLog memory workerLog = WorkersImpl.getLatestWorkerLogImpl(worker, block.number);
        require(workerLog.workerEventType == EnigmaCommon.WorkerLogType.LogOut,
            "Worker's last log is not of LogOut type");
        require(getFirstBlockNumber(block.number) > workerLog.blockNumber,
            "Cannot withdraw in same epoch as log out event");
        _;
    }

    /**
    * Checks secret contract has not been deployed
    *
    * @param _scAddr Secret contract address
    */
    modifier contractUndefined(bytes32 _scAddr) {
        require(state.contracts[_scAddr].status == EnigmaCommon.SecretContractStatus.Undefined,
            "Secret contract already deployed");
        _;
    }

    /**
    * Checks secret contract has been deployed
    *
    * @param _scAddr Secret contract address
    */
    modifier contractDeployed(bytes32 _scAddr) {
        require(state.contracts[_scAddr].status == EnigmaCommon.SecretContractStatus.Deployed,
            "Secret contract not deployed");
        _;
    }

    /**
    * Checks task record has been created and is still pending receipt
    *
    * @param _taskId Task ID
    */
    modifier taskWaiting(bytes32 _taskId) {
        require(state.tasks[_taskId].status == EnigmaCommon.TaskStatus.RecordCreated, "Task is not waiting");
        _;
    }

    /**
    * Ensure signing key used for registration is unique
    *
    */
    modifier areOperatingAndStakingDiff(address _stakingAddress) {
        require(_stakingAddress != msg.sender, "Operating address not different from staking address");
        _;
    }

    /**
    * Ensure staking address can set an operating address
    *
    */
    modifier canSetOperatingAddress(address _operatingAddress) {
        require(state.stakingToOperatingAddresses[msg.sender] == address(0),
            "Staking address currently tied to an in-use operating address");
        require(state.workers[_operatingAddress].stakingAddress == msg.sender,
            "Invalid staking address for this operating address");
        _;
    }

    /**
    * Ensure signing key used for registration is unique
    *
    * @param _signer Signing key
    */
    modifier isUniqueSigningKey(address _signer) {
        for (uint i = 0; i < state.workerAddresses.length; i++) {
            require(state.workers[state.workerAddresses[i]].signer != _signer,
                "Not a unique signing key");
        }
        _;
    }

    /**
    * Ensure that the contract's context is the updated contract
    *
    */
    modifier isUpdatedEnigmaContract() {
        require(address(this) == state.updatedEnigmaContractAddress, "Not updated Enigma contract");
        _;
    }

    /**
    * Ensure the sender of the recent call is the updated contract
    *
    */
    modifier fromUpdatedEnigmaContract() {
        require(msg.sender == state.updatedEnigmaContractAddress, "Not from updated Enigma contract");
        _;
    }

    // ========================================== Functions ==========================================

    /**
    * Registers a new worker or change the signer parameters of an existing
    * worker. This should be called by every worker (and the principal)
    * node in order to receive tasks.
    *
    * @param _stakingAddress The operating address
    * @param _signer The signer address, derived from the enclave public key
    * @param _report The RLP encoded report returned by the IAS
    * @param _signature Signature
    */
    function register(address _stakingAddress, address _signer, bytes memory _report, bytes memory _signature)
    public
    isUpdatedEnigmaContract
    workerUnregistered(msg.sender)
    isUniqueSigningKey(_signer)
    areOperatingAndStakingDiff(_stakingAddress)
    {
        WorkersImpl.registerImpl(state, _stakingAddress, _signer, _report, _signature);
    }

    /**
    * Unregisters a staking address' worker.
    *
    */
    function unregister()
    public
    isUpdatedEnigmaContract
    stakingOrOperatingAddressRegistered
    emptyBalance
    {
        WorkersImpl.unregisterImpl(state);
    }

    /**
    * Deposits ENG stake into contract from staking address. Staking address' operating address must be registered.
    *
    * @param _custodian The staking address to deposit from
    * @param _amount The amount of ENG, in grains format (10 ** 8), to deposit
    */
    function deposit(address _custodian, uint _amount)
    public
    isUpdatedEnigmaContract
    workerRegistered(state.stakingToOperatingAddresses[_custodian])
    {
        WorkersImpl.depositImpl(state, _custodian, _amount);
    }

    /**
    * Withdraws ENG stake from contract back to staking address. Staking address' operating address must be registered.
    *
    * @param _amount The amount of ENG, in grains format (10 ** 8), to withdraw
    */
    function withdraw(uint _amount)
    public
    canWithdraw
    {
        WorkersImpl.withdrawImpl(state, _amount);
    }

    /**
    * Login worker. Worker must be registered to do so, and must be logged in at start of epoch to be part of worker
    * selection process.
    */
    function login() public canLogIn {
        WorkersImpl.loginImpl(state);
    }

    /**
    * Logout worker. Worker must be logged in to do so.
    */
    function logout() public stakingOrOperatingAddressLoggedIn {
        WorkersImpl.logoutImpl(state);
    }

    /**
    * Deploy secret contract from user, called by the worker.
    *
    * @param _taskId Task ID of corresponding deployment task (taskId == scAddr)
    * @param _codeHash Deployed bytecode hash
    * @param _gasUsed Gas used for task
    * @param _sig Worker's signature for deployment
    */
    function deploySecretContractFailure(
        bytes32 _taskId,
        bytes32 _codeHash,
        uint64 _gasUsed,
        bytes memory _sig
    )
    public
    isUpdatedEnigmaContract
    workerLoggedIn
    contractUndefined(_taskId)
    {
        TaskImpl.deploySecretContractFailureImpl(state, _taskId, _codeHash, _gasUsed, _sig);
    }

    /**
    * Deploy secret contract from user, called by the worker.
    *
    * @param _gasUsed Gas used for task
    * @param _optionalEthereumContractAddress Initial state delta hash as a result of the contract's constructor
    * @param _bytes32s [taskId, preCodeHash, codeHash, initStateDeltaHash]
    * @param _optionalEthereumData Initial state delta hash as a result of the contract's constructor
    * @param _sig Worker's signature for deployment
    */
    function deploySecretContract(
        uint64 _gasUsed,
        address _optionalEthereumContractAddress,
        bytes32[4] memory _bytes32s,
        bytes memory _optionalEthereumData,
        bytes memory _sig
    )
    public
    isUpdatedEnigmaContract
    workerLoggedIn
    contractUndefined(_bytes32s[0])
    {
        TaskImpl.deploySecretContractImpl(state, _gasUsed, _optionalEthereumContractAddress, _bytes32s,
            _optionalEthereumData, _sig);
    }

    /**
    * Check if secret contract has been deployed
    *
    * @return  Number of deployed secret contracts
    */
    function countSecretContracts()
    public
    view
    returns (uint)
    {
        return SecretContractImpl.countSecretContractsImpl(state);
    }

    /**
    * Get deployed secret contract addresses within a range
    *
    * @param _start Start of range
    * @param _stop End of range
    * @return Subset of deployed secret contract addresses
    */
    function getSecretContractAddresses(uint _start, uint _stop)
    public
    view
    returns (bytes32[] memory)
    {
        return SecretContractImpl.getSecretContractAddressesImpl(state, _start, _stop);
    }

    /**
    * Create task record for contract deployment. This is necessary for transferring task fee from sender to contract,
    * generating the unique taskId, saving the block number when the record was mined, and incrementing the user's
    * task deployment counter nonce. We revert the process if the locally-generated nonce value does not match
    * the on-chain-computed nonce since this indicates that the secret contract address the user has generated is
    * invalid.
    *
    * @param _inputsHash Hash of encrypted fn sig, encrypted ABI-encoded args, and predeployed bytecode hash
    * @param _gasLimit ENG gas limit
    * @param _gasPx ENG gas price in grains format (10 ** 8)
    * @param _firstBlockNumber Locally-computed first block number of epoch
    * @param _nonce Locally-computed nonce value for this deployment
    */
    function createDeploymentTaskRecord(
        bytes32 _inputsHash,
        uint64 _gasLimit,
        uint64 _gasPx,
        uint _firstBlockNumber,
        uint _nonce
    )
    public
    onlyOwner
    isUpdatedEnigmaContract
    {
        TaskImpl.createDeploymentTaskRecordImpl(state, _inputsHash, _gasLimit, _gasPx, _firstBlockNumber, _nonce);
    }

    /**
    * Create task record for task for regular tasks. This is necessary for transferring task fee from sender to
    * contract, generating the unique taskId, saving the block number when the record was mined, and incrementing
    * the user's task deployment counter nonce.
    *
    * @param _inputsHash Hash of encrypted fn sig, encrypted ABI-encoded args, and contract address
    * @param _gasLimit ENG gas limit
    * @param _gasPx ENG gas price in grains format (10 ** 8)
    * @param _firstBlockNumber Locally-computed first block number of epoch
    */
    function createTaskRecord(
        bytes32 _inputsHash,
        uint64 _gasLimit,
        uint64 _gasPx,
        uint _firstBlockNumber
    )
    public
    isUpdatedEnigmaContract
    {
        TaskImpl.createTaskRecordImpl(state, _inputsHash, _gasLimit, _gasPx, _firstBlockNumber);
    }

    /**
    * Commit the computation task results on chain by first verifying the receipt and then the worker's signature.
    * The task record is finalized and the worker is credited with the task fee.
    *
    * @param _gasUsed Gas used for task computation
    * @param _optionalEthereumContractAddress Output state hash
    * @param _bytes32s [scAddr, taskId, stateDeltaHash, outputHash]
    * @param _optionalEthereumData Output state hash
    * @param _sig Worker's signature
    */
    function commitReceipt(
        uint64 _gasUsed,
        address _optionalEthereumContractAddress,
        bytes32[4] memory _bytes32s,
        bytes memory _optionalEthereumData,
        bytes memory _sig
    )
    public
    isUpdatedEnigmaContract
    workerLoggedIn
    contractDeployed(_bytes32s[0])
    {
        TaskImpl.commitReceiptImpl(state, _sig, _gasUsed, _optionalEthereumContractAddress,
            _bytes32s, _optionalEthereumData);
    }

    /**
    * Commit the computation task failure on chain - the task fee is transfered to the worker and the status is
    * updated to indicate task failure.
    *
    * @param _scAddr Secret contract address
    * @param _taskId Unique taskId
    * @param _outputHash Output state hash
    * @param _gasUsed Gas used for task computation
    * @param _sig Worker's signature
    */
    function commitTaskFailure(
        bytes32 _scAddr,
        bytes32 _taskId,
        bytes32 _outputHash,
        uint64 _gasUsed,
        bytes memory _sig
    )
    public
    isUpdatedEnigmaContract
    workerLoggedIn
    contractDeployed(_scAddr)
    {
        TaskImpl.commitTaskFailureImpl(state, _scAddr, _taskId, _outputHash, _gasUsed, _sig);
    }

    /**
    * Return the task fee to the task creator when too many blocks have elapsed without task resolution.
    *
    * @param _taskId Unique taskId
    */
    function returnFeesForTask(bytes32 _taskId)
    public
    taskWaiting(_taskId)
    {
        TaskImpl.returnFeesForTaskImpl(state, _taskId);
    }

    /**
    * Reparameterizing workers with a new seed
    * This should be called for each epoch by the Principal node
    *
    * @param _blockNumber Block number principal node is attempting to set worker params
    * @param _seed The random integer generated by the enclave
    * @param _sig Principal node's signature
    */
    function setWorkersParams(uint _blockNumber, uint _seed, bytes memory _sig)
    public
    isUpdatedEnigmaContract
    workerRegistered(msg.sender)
    {
        PrincipalImpl.setWorkersParamsImpl(state, _blockNumber, _seed, _sig);
    }

    /**
    * Get active workers before a certain block number
    *
    * @param _blockNumber Block number
    */
    function getActiveWorkers(uint _blockNumber)
    public
    view
    returns (address[] memory, uint[] memory)
    {
        return PrincipalImpl.getActiveWorkersImpl(state, _blockNumber);
    }

    /**
    * Get the first block number of an epoch that a given block number belongs to
    *
    * @param _blockNumber Block number
    * @return Block number
    */
    function getFirstBlockNumber(uint _blockNumber)
    public
    view
    returns (uint) {
        return WorkersImpl.getFirstBlockNumberImpl(state, _blockNumber);
    }

    /**
    * Get worker params for an epoch given a particular block number
    *
    * @param _blockNumber Block number
    * @return Epoch's first block number
    * @return Seed
    * @return Array of worker's signing addresses
    * @return Array of worker's stakes
    */
    function getWorkerParams(uint _blockNumber)
    public
    view
    returns (uint, uint, address[] memory, uint[] memory) {
        return WorkersImpl.getWorkerParamsImpl(state, _blockNumber);
    }

    /**
    * Select a group of workers for the computation task given the block number of the task record (implies the epoch)
    * and the secret contract address.
    *
    * @param _blockNumber Block number the task record was mined
    * @param _scAddr Secret contract address
    * @return Selected workers' addresses
    */
    function getWorkerGroup(uint _blockNumber, bytes32 _scAddr)
    public
    view
    returns (address[] memory)
    {
        return WorkersImpl.getWorkerGroupImpl(state, _blockNumber, _scAddr);
    }

    /**
    * The RLP encoded report returned by the IAS server
    *
    * @param _custodian The worker's custodian address
    */
    function getReport(address _custodian)
    public
    view
    workerRegistered(_custodian)
    returns (address, bytes memory)
    {
        return WorkersImpl.getReportImpl(state, _custodian);
    }

    /**
    * This verifies an IAS report with hard coded modulus and exponent of Intel's certificate.
    * @param _data The report itself
    * @param _signature The signature of the report
    */
    function verifyReport(bytes memory _data, bytes memory _signature)
    public
    view
    returns (uint)
    {
        return WorkersImpl.verifyReportImpl(_data, _signature);
    }

    /**
    * Upgrade Enigma Contract
    * @param _updatedEnigmaContractAddress Updated newly-deployed Enigma contract address
    */
    function upgradeEnigmaContract(address _updatedEnigmaContractAddress)
    public
    onlyOwner
    isUpdatedEnigmaContract
    {
        return UpgradeImpl.upgradeEnigmaContractImpl(state, _updatedEnigmaContractAddress);
    }

    /**
    * Transfer worker stake from old contract to new contract upon registration
    * @param _operatingAddress Operating Address
    * @param _stakingAddress Newly-registered worker address
    * @param _sig Signature
    */
    function transferWorkerStakePostUpgrade(address _operatingAddress, address _stakingAddress, bytes memory _sig)
    public
    fromUpdatedEnigmaContract
    returns (uint256)
    {
        return UpgradeImpl.transferWorkerStakePostUpgradeImpl(state, _operatingAddress, _stakingAddress, _sig);
    }

    /**
    * Set mrSigner
    * @param _mrSigner mrSigner
    */
    function setMrSigner(bytes memory _mrSigner)
    public
    onlyOwner
    {
        state.mrSigner = _mrSigner;
    }

    /**
    * Set isvSvn
    * @param _isvSvn mrSigner
    */
    function setIsvSvn(bytes memory _isvSvn)
    public
    onlyOwner
    {
        state.isvSvn = _isvSvn;
    }

    /**
    * Set operating address for a particular staking address
    * @param _operatingAddress Operating Address
    */
    function setOperatingAddress(address _operatingAddress)
    public
    canSetOperatingAddress(_operatingAddress)
    {
        WorkersImpl.setOperatingAddressImpl(state, _operatingAddress);
    }
}
