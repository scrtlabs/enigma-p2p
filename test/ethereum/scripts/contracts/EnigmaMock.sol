pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";
import "./utils/SolRsaVerify.sol";

contract ERC20 {
    function allowance(address owner, address spender) public view returns (uint256);

    function transferFrom(address from, address to, uint256 value) public returns (bool);

    function approve(address spender, uint256 value) public returns (bool);

    function totalSupply() public view returns (uint256);

    function balanceOf(address who) public view returns (uint256);

    function transfer(address to, uint256 value) public returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

//MOCK
contract EnigmaMock {
    using SafeMath for uint256;
    using ECDSA for bytes32;

    // ========================================== Structs ==========================================

    struct TaskRecord {
        bytes32 inputsHash; // Inputs hash of encryptedFn, encryptedArgs, and contract address/preCodeHash)
        uint gasLimit; // ENG gas limit units
        uint gasPx; // ENG gas px in grains (10 ** 8) amount
        bytes proof; // Signature of (taskId, inStateDeltaHash, outStateDeltaHash, ethCall)
        address sender; // Sender of TaskRecord
        uint blockNumber; // Block number TaskRecord was mined
        TaskStatus status; // RecordUndefined: 0; RecordCreated: 1; ReceiptVerified: 2; ReceiptFailed: 3
    }

    struct Worker {
        address signer; // Enclave address
        WorkerStatus status; // Unregistered: 0, Registered: 1, LoggedIn: 2, LoggedOut: 3
        bytes report; // Decided to store this as one  RLP encoded attribute for easier external storage in the future
        uint256 balance; // ENG balance
    }

    /**
    * The data representation of the worker parameters used as input for
    * the worker selection algorithm
    */
    struct WorkersParams {
        uint firstBlockNumber;
        address[] workers;
        uint[] balances;
        uint seed;
        uint nonce;
    }

    struct SecretContract {
        address owner; // Owner who deployed secret contract
        bytes32 preCodeHash; // Predeployed bytecode hash
        bytes32 codeHash; // Deployed bytecode hash
        bytes32[] stateDeltaHashes;
        bytes32 outputHash;
        SecretContractStatus status; // Undefined: 0, Deployed: 1
        // TODO: consider keeping an index of taskIds
    }

    // ========================================== Enums ==========================================

    enum TaskStatus {RecordUndefined, RecordCreated, ReceiptVerified, ReceiptFailed}

    enum WorkerStatus {Unregistered, Registered, LoggedIn, LoggedOut}

    enum SecretContractStatus {Undefined, Deployed}

    // ========================================== Events ==========================================

    event Registered(address custodian, address signer);
    event ValidatedSig(bytes sig, bytes32 hash, address workerAddr);
    event WorkersParameterized(uint seed, uint256 blockNumber, address[] workers, uint[] balances, uint nonce);
    event TaskRecordCreated(bytes32 taskId, uint gasLimit, uint gasPx, address sender);
    event TaskRecordsCreated(bytes32[] taskIds, uint[] gasLimits, uint[] gasPxs, address sender);
    event ReceiptVerified(bytes32 taskId, bytes32 stateDeltaHash, bytes32 outputHash, bytes ethCall, bytes sig);
    event ReceiptsVerified(bytes32[] taskIds, bytes32[] stateDeltaHashes, bytes32 outputHash, bytes ethCall, bytes sig);
    event ReceiptFailed(bytes32 taskId, bytes ethCall, bytes sig);
    event TaskFeeReturned(bytes32 taskId);
    event DepositSuccessful(address from, uint value);
    event WithdrawSuccessful(address to, uint value);
    event SecretContractDeployed(bytes32 scAddr, bytes32 codeHash);

    // ========================================== State Variables ==========================================

    // The interface of the deployed ENG ERC20 token contract
    ERC20 public engToken;

    // Epoch size in number of blocks
    uint public epochSize = 100;

    // Task timeout size in number of blocks
    uint public taskTimeoutSize = 200;

    /**
    * The signer address of the principal node
    * This must be set when deploying the contract and remains immutable
    * Since the signer address is derived from the public key of an
    * SGX enclave, this ensures that the principal node cannot be tempered
    * with or replaced.
    */
    address principal;

    /**
    * The last 5 worker parameters
    * We keep a collection of worker parameters to account for latency issues.
    * A computation task might be conceivably given out at a certain block number
    * but executed at a later block in a different epoch. It follows that
    * the contract must have access to the worker parameters effective when giving
    * out the task, otherwise the selected worker would not match. We calculated
    * that keeping the last 5 items should be more than enough to account for
    * all latent tasks. Tasks results will be rejected past this limit.
    */
    WorkersParams[5] workersParams;

    // An address-based index of all registered worker
    address[] public workerAddresses;
    // An address-based index of all secret contracts
    bytes32[] public scAddresses;

    // A registry of all registered workers with their attributes
    mapping(address => Worker) public workers;

    // A registry of all tasks with their attributes
    mapping(bytes32 => TaskRecord) public tasks;

    // A registry of all deployed secret contracts with their attributes
    mapping(bytes32 => SecretContract) public contracts;

    // A mapping of number of tasks deployed for each address
    mapping(address => uint) public userTaskDeployments;

    // TODO: do we keep tasks forever? if not, when do we delete them?
    uint stakingThreshold;
    uint public workerGroupSize;

    // ========================================== Constructor ==========================================

    constructor(address _tokenAddress, address _principal) public {
        engToken = ERC20(_tokenAddress);
        principal = _principal;
        stakingThreshold = 1;
        workerGroupSize = 5;
    }

    //TODO: break down these methods into services for upgradability

    // ========================================== Modifiers ==========================================

    /**
    * Checks if the custodian wallet is registered as a worker
    *
    * @param _user The custodian address of the worker
    */
    modifier workerRegistered(address _user) {
        Worker memory worker = workers[_user];
        require(worker.status != WorkerStatus.Unregistered, "Unregistered worker");
        _;
    }

    /**
    * Checks if the custodian wallet is logged in as a worker
    *
    * @param _user The custodian address of the worker
    */
    modifier workerLoggedIn(address _user) {
        Worker memory worker = workers[_user];
        require(worker.status == WorkerStatus.LoggedIn, "Worker not logged in");
        _;
    }

    /**
    * Checks secret contract has not been deployed
    *
    * @param _scAddr Secret contract address
    */
    modifier contractUndefined(bytes32 _scAddr) {
        require(contracts[_scAddr].status == SecretContractStatus.Undefined, "Secret contract already deployed");
        _;
    }

    /**
    * Checks secret contract has been deployed
    *
    * @param _scAddr Secret contract address
    */
    modifier contractDeployed(bytes32 _scAddr) {
        require(contracts[_scAddr].status == SecretContractStatus.Deployed, "Secret contract not deployed");
        _;
    }

    /**
    * Checks task record has been created and is still pending receipt
    *
    * @param _taskId Task ID
    */
    modifier taskWaiting(bytes32 _taskId) {
        require(tasks[_taskId].status == TaskStatus.RecordCreated, "Task is not waiting");
        _;
    }

    // ========================================== Functions ==========================================

    /**
    * Registers a new worker of change the signer parameters of an existing
    * worker. This should be called by every worker (and the principal)
    * node in order to receive tasks.
    *
    * @param _signer The signer address, derived from the enclave public key
    * @param _report The RLP encoded report returned by the IAS
    */
    function register(address _signer, bytes memory _report, bytes memory _signature)
    public
    {
        // TODO: consider exit if both signer and custodian are matching
        // If the custodian is not already register, we add an index entry
        if (workers[msg.sender].signer == address(0)) {
            workerAddresses.push(msg.sender);
        }
        //MOCK
        //require(verifyReport(_report, _signature) == 0, "Verifying signature failed");

        // Set the custodian attributes
        workers[msg.sender].signer = _signer;
        workers[msg.sender].balance = 0;
        workers[msg.sender].report = _report;
        workers[msg.sender].status = WorkerStatus.Registered;

        emit Registered(msg.sender, _signer);
    }

    /**
    * Deposits ENG stake into contract from worker. Worker must be registered to do so.
    *
    * @param _custodian The worker's ETH address
    * @param _amount The amount of ENG, in grains format (10 ** 8), to deposit
    */
    function deposit(address _custodian, uint _amount)
    public
    workerRegistered(_custodian)
    {
        //MOCK
        //require(engToken.allowance(_custodian, address(this)) >= _amount, "Not enough tokens allowed for transfer");
        //require(engToken.transferFrom(_custodian, address(this), _amount), "Token transfer failed");

        workers[_custodian].balance = workers[_custodian].balance.add(_amount);

        emit DepositSuccessful(_custodian, _amount);
    }

    /**
    * Withdraws ENG stake from contract back to worker. Worker must be registered to do so.
    *
    * @param _custodian The worker's ETH address
    * @param _amount The amount of ENG, in grains format (10 ** 8), to deposit
    */
    function withdraw(address _custodian, uint _amount)
    public
    workerRegistered(_custodian)
    {
        require(workers[_custodian].balance >= _amount, "Not enough tokens in worker balance");
        //MOCK
        //require(engToken.transfer(_custodian, _amount), "Token transfer failed");

        workers[_custodian].balance = workers[_custodian].balance.sub(_amount);

        emit WithdrawSuccessful(_custodian, _amount);
    }

    /**
    * Login worker. Worker must be registered to do so, and must be logged in at start of epoch to be part of worker
    * selection process.
    */
    function login() public workerRegistered(msg.sender) {
        workers[msg.sender].status = WorkerStatus.LoggedIn;
    }

    /**
    * Logout worker. Worker must be logged in to do so.
    */
    function logout() public workerLoggedIn(msg.sender) {
        workers[msg.sender].status = WorkerStatus.LoggedOut;
    }

    /**
    * Deploy secret contract from user, called by the worker.
    *
    * @param _taskId Task ID of corresponding deployment task (taskId == scAddr)
    * @param _preCodeHash Predeployed bytecode hash
    * @param _codeHash Deployed bytecode hash
    * @param _initStateDeltaHash Initial state delta hash as a result of the contract's constructor
    * @param _gasUsed Gas used for task
    * @param _sig Worker's signature for deployment
    */
    function deploySecretContract(bytes32 _taskId, bytes32 _preCodeHash, bytes32 _codeHash, bytes32 _initStateDeltaHash,
        uint _gasUsed, bytes memory _sig)
    public
    workerLoggedIn(msg.sender)
    contractUndefined(_taskId)
    {

        //MOCK
        // Index into task records based on _taskId to find corresponding deployment task
//        TaskRecord storage task = tasks[_taskId];
//        require(task.status == TaskStatus.RecordCreated, "Invalid task status");

        //MOCK
        // Check that worker isn't charging the user too high of a fee
        //require(task.gasLimit >= _gasUsed, "Too much gas used for task");

        //MOCK
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        //address selectedWorker = getWorkerGroup(task.blockNumber, _taskId)[0];
        //require(msg.sender == selectedWorker, "Not the selected worker for this task");

        //MOCK
        // Verify the worker's signature
        //bytes32 msgHash = keccak256(abi.encodePacked(task.inputsHash, _codeHash, _initStateDeltaHash, _gasUsed, true));
        //require(msgHash.recover(_sig) == workers[msg.sender].signer, "Invalid signature");

        // Set the secret contract's attributes in registry
        SecretContract storage secretContract = contracts[_taskId];
        //MOCK
        //secretContract.owner = task.sender;
        secretContract.preCodeHash = _preCodeHash;
        secretContract.codeHash = _codeHash;
        secretContract.status = SecretContractStatus.Deployed;
        secretContract.stateDeltaHashes.push(_initStateDeltaHash);
        scAddresses.push(_taskId);

        //MOCK
        // Finalize task record for deployment task
        //task.proof = _sig;
        //task.status = TaskStatus.ReceiptVerified;

        //MOCK
        // Credit worker with the fees associated with this task
        //workers[msg.sender].balance = workers[msg.sender].balance.add(_gasUsed.mul(task.gasPx));

        //MOCK
        // Credit the task sender with the unused gas fees
        //require(engToken.transfer(task.sender, (task.gasLimit.sub(_gasUsed)).mul(task.gasPx)), "Token transfer failed");

        emit SecretContractDeployed(_taskId, _codeHash);
    }

    /**
    * Check if secret contract has been deployed
    *
    * @param _scAddr Secret contract address
    * @return  true/false
    */
    function isDeployed(bytes32 _scAddr)
    public
    view
    returns (bool)
    {
        if (contracts[_scAddr].status == SecretContractStatus.Deployed) {
            return true;
        } else {
            return false;
        }
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
        return scAddresses.length;
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
        if (_stop == 0) {
            _stop = scAddresses.length;
        }
        bytes32[] memory addresses = new bytes32[](_stop.sub(_start));
        uint pos = 0;
        for (uint i = _start; i < _stop; i++) {
            addresses[pos] = scAddresses[i];
            pos++;
        }
        return addresses;
    }

    /**
    * Count state deltas for a deployed secret contract
    *
    * @param _scAddr Secret contract address
    * @return Number of state deltas for deployed secret contract
    */
    function countStateDeltas(bytes32 _scAddr)
    public
    view
    contractDeployed(_scAddr)
    returns (uint)
    {
        return contracts[_scAddr].stateDeltaHashes.length;
    }

    /**
    * Obtain state delta hash for a deployed secret contract at a particular index
    *
    * @param _scAddr Secret contract address
    * @param _index Index in list of state deltas
    * @return State delta hash
    */
    function getStateDeltaHash(bytes32 _scAddr, uint _index)
    public
    view
    contractDeployed(_scAddr)
    returns (bytes32)
    {
        return contracts[_scAddr].stateDeltaHashes[_index];
    }

    /**
    * Obtain state delta hashes for a deployed secret contract within a range
    *
    * @param _start Start of range
    * @param _stop End of range
    * @return Subset of state delta hashes for deployed secret contract
    */
    function getStateDeltaHashes(bytes32 _scAddr, uint _start, uint _stop)
    public
    view
    contractDeployed(_scAddr)
    returns (bytes32[] memory)
    {
        if (_stop == 0) {
            _stop = contracts[_scAddr].stateDeltaHashes.length;
        }
        bytes32[] memory deltas = new bytes32[](_stop.sub(_start));
        uint pos = 0;
        for (uint i = _start; i < _stop; i++) {
            deltas[pos] = contracts[_scAddr].stateDeltaHashes[i];
            pos++;
        }
        return deltas;
    }

    /**
    * Check if particular state delta hash for a deployed secret contract is valid
    *
    * @param _scAddr Secret contract address
    * @param _stateDeltaHash State delta hash
    * @return true/false
    */
    function isValidDeltaHash(bytes32 _scAddr, bytes32 _stateDeltaHash)
    public
    view
    contractDeployed(_scAddr)
    returns (bool)
    {
        bool valid = false;
        for (uint i = 0; i < contracts[_scAddr].stateDeltaHashes.length; i++) {
            if (contracts[_scAddr].stateDeltaHashes[i] == _stateDeltaHash) {
                valid = true;
                break;
            }
        }
        return valid;
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
    * @param _scAddr Secret contract address for this task
    * @param _nonce Locally-computed nonce value for this deployment
    */
    function createDeploymentTaskRecord(
        bytes32 _inputsHash,
        uint _gasLimit,
        uint _gasPx,
        uint _firstBlockNumber,
        bytes32 _scAddr,
        uint _nonce
    )
    public
    {
        //MOCK
        // Check that the locally-generated nonce matches the on-chain value, otherwise _scAddr is invalid
        //require(userTaskDeployments[msg.sender] == _nonce, "Incorrect nonce yielding bad secret contract address");

        //MOCK
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        //require(_firstBlockNumber == getFirstBlockNumber(block.number), "Wrong epoch for this task");

        //MOCK
        // Transfer fee from sender to contract
        //uint fee = _gasLimit.mul(_gasPx);
        //require(engToken.allowance(msg.sender, address(this)) >= fee, "Allowance not enough");
        //require(engToken.transferFrom(msg.sender, address(this), fee), "Transfer not valid");

        // Create taskId and TaskRecord
        //MOCK
        bytes32 taskId = 0xf29647ec8920b552fa96de8cc3129b5ba70471b190c8ec5a4793467f12ad84e9;//_nonce;
        TaskRecord storage task = tasks[taskId];
        require(task.sender == address(0), "Task already exists");
        task.inputsHash = _inputsHash;
        task.gasLimit = _gasLimit;
        task.gasPx = _gasPx;
        task.sender = msg.sender;
        task.blockNumber = block.number;
        task.status = TaskStatus.RecordCreated;

        // Increment user task deployment nonce
        userTaskDeployments[msg.sender]++;

        emit TaskRecordCreated(taskId, _gasLimit, _gasPx, msg.sender);
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
    * @param _scAddr Secret contract address for this task
    */
    function createTaskRecord(
        bytes32 _inputsHash,
        uint _gasLimit,
        uint _gasPx,
        uint _firstBlockNumber,
        bytes32 _scAddr
    )
    public
    {
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        require(_firstBlockNumber == getFirstBlockNumber(block.number), "Wrong epoch for this task");

        // Transfer fee from sender to contract
        uint fee = _gasLimit.mul(_gasPx);
        require(engToken.allowance(msg.sender, address(this)) >= fee, "Allowance not enough");
        require(engToken.transferFrom(msg.sender, address(this), fee), "Transfer not valid");

        // Create taskId and TaskRecord
        bytes32 taskId = keccak256(abi.encodePacked(msg.sender, userTaskDeployments[msg.sender]));
        TaskRecord storage task = tasks[taskId];
        require(task.sender == address(0), "Task already exists");
        task.inputsHash = _inputsHash;
        task.gasLimit = _gasLimit;
        task.gasPx = _gasPx;
        task.sender = msg.sender;
        task.blockNumber = block.number;
        task.status = TaskStatus.RecordCreated;

        // Increment user task deployment nonce
        userTaskDeployments[msg.sender]++;

        emit TaskRecordCreated(taskId, _gasLimit, _gasPx, msg.sender);
    }

    /**
    * Create task records for tasks (either contract deployment or regular tasks). This is necessary for
    * transferring task fee from sender to contract, generating the unique taskId, saving the block number
    * when the record was mined, and incrementing the user's task deployment counter nonce.
    *
    * @param _inputsHashes Hashes of encrypted fn sig, encrypted ABI-encoded args, and contract address
    * @param _gasLimits ENG gas limit
    * @param _gasPxs ENG gas price in grains format (10 ** 8)
    * @param _selectedWorker Locally computed selected worker address for task
    * @param _scAddr Secret contract address for this task
    */
    function createTaskRecords(
        bytes32[] memory _inputsHashes,
        uint[] memory _gasLimits,
        uint[] memory _gasPxs,
        address _selectedWorker,
        bytes32 _scAddr
    )
    public
    {
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        address verifySelectedWorker = getWorkerGroup(block.number, _scAddr)[0];
        require(_selectedWorker == verifySelectedWorker, "Not the selected worker for this task");

        bytes32[] memory taskIds = new bytes32[](_inputsHashes.length);
        for (uint i = 0; i < _inputsHashes.length; i++) {
            // Transfer fee from sender to contract
            uint fee = _gasLimits[i].mul(_gasPxs[i]);
            require(engToken.allowance(msg.sender, address(this)) >= fee, "Allowance not enough");
            require(engToken.transferFrom(msg.sender, address(this), fee), "Transfer not valid");

            // Create taskId and TaskRecord
            bytes32 taskId = keccak256(abi.encodePacked(msg.sender, userTaskDeployments[msg.sender]));
            TaskRecord storage task = tasks[taskId];
            require(task.sender == address(0), "Task already exists");
            taskIds[i] = taskId;
            task.inputsHash = _inputsHashes[i];
            task.gasLimit = _gasLimits[i];
            task.gasPx = _gasPxs[i];
            task.sender = msg.sender;
            task.blockNumber = block.number;
            task.status = TaskStatus.RecordCreated;

            // Increment user task deployment nonce
            userTaskDeployments[msg.sender]++;
        }
        emit TaskRecordsCreated(taskIds, _gasLimits, _gasPxs, msg.sender);
    }

    // Execute the encoded function in the specified contract
    function executeCall(address _to, uint256 _value, bytes memory _data)
    internal
    returns (bool success)
    {
        assembly {
            success := call(gas, _to, _value, add(_data, 0x20), mload(_data), 0, 0)
        }
    }

    /**
    * Verify the task receipt prior to committing/finalizing it on chain.
    *
    * @param _scAddr Secret contract address
    * @param _taskId Unique taskId
    * @param _stateDeltaHash Input state delta hash
    * @param _gasUsed Gas used for task computation
    * @param _sender Worker address
    * @param _sig Worker's signature
    */
    function verifyReceipt(bytes32 _scAddr, bytes32 _taskId, bytes32 _stateDeltaHash, uint _gasUsed, address _sender,
        bytes memory _sig)
    internal
    {
        TaskRecord storage task = tasks[_taskId];
        require(task.status == TaskStatus.RecordCreated, 'Invalid task status');

        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        require(_sender == getWorkerGroup(task.blockNumber, _scAddr)[0], "Not the selected worker for this task");

        // Check that worker isn't charging the user too high of a fee
        require(task.gasLimit >= _gasUsed, "Too much gas used for task");

        // Update proof and status attributes of TaskRecord
        task.proof = _sig;
        task.status = TaskStatus.ReceiptVerified;

        // Credit worker with the fees associated with this task
        workers[_sender].balance = workers[_sender].balance.add(_gasUsed.mul(task.gasPx));

        // Credit the task sender with the unused gas fees
        require(engToken.transfer(task.sender, (task.gasLimit.sub(_gasUsed)).mul(task.gasPx)),
            "Token transfer failed");
    }

    /**
    * Commit the computation task results on chain by first verifying the receipt and then the worker's signature.
    * The task record is finalized and the worker is credited with the task's fee.
    *
    * @param _scAddr Secret contract address
    * @param _taskId Unique taskId
    * @param _stateDeltaHash Input state delta hash
    * @param _outputHash Output state hash
    * @param _gasUsed Gas used for task computation
    * @param _ethCall Eth call
    * @param _sig Worker's signature
    */
    function commitReceipt(
        bytes32 _scAddr,
        bytes32 _taskId,
        bytes32 _stateDeltaHash,
        bytes32 _outputHash,
        uint _gasUsed,
        bytes memory _ethCall,
        bytes memory _sig
    )
    public
    workerLoggedIn(msg.sender)
    contractDeployed(_scAddr)
    {
        SecretContract storage secretContract = contracts[_scAddr];
        // Obtain the last state delta hash the contract is aware of
        bytes32 lastStateDeltaHash = secretContract.stateDeltaHashes[secretContract.stateDeltaHashes.length - 1];

        //MOCK
        // Verify the receipt
        //verifyReceipt(_scAddr, _taskId, _stateDeltaHash, _gasUsed, msg.sender, _sig);
        //bytes32 inputsHash = tasks[_taskId].inputsHash;

        // Append the new state delta hash and set the contract's output hash
        secretContract.stateDeltaHashes.push(_stateDeltaHash);
        secretContract.outputHash = _outputHash;

        //MOCK
        // Check worker's signature
        //        bytes32 msgHash = keccak256(abi.encodePacked(inputsHash, secretContract.codeHash, _stateDeltaHash,
        //            _outputHash, _gasUsed, lastStateDeltaHash, true));
        //        require(msgHash.recover(_sig) == workers[msg.sender].signer, "Invalid signature");

        emit ReceiptVerified(_taskId, _stateDeltaHash, _outputHash, _ethCall, _sig);
    }

    /**
   * Commit the computation task results on chain by first verifying the receipts and then the worker's signature.
   * The task records are finalized and the worker is credited with the tasks' fees.
   *
   * @param _scAddr Secret contract address
   * @param _taskIds Unique taskId
   * @param _stateDeltaHashes Input state delta hashes
   * @param _outputHash Output state hashes
   * @param _ethCall Eth call
   * @param _sig Worker's signature
   */
    function commitReceipts(
        bytes32 _scAddr,
        bytes32[] memory _taskIds,
        bytes32[] memory _stateDeltaHashes,
        bytes32 _outputHash,
        uint[] memory _gasesUsed,
        bytes memory _ethCall,
        bytes memory _sig
    )
    public
    workerLoggedIn(msg.sender)
    contractDeployed(_scAddr)
    {
        bytes32[] memory inputsHashes = new bytes32[](_taskIds.length);
        SecretContract storage secretContract = contracts[_scAddr];
        // Obtain the last state delta hash the contract is aware of
        bytes32 lastStateDeltaHash = secretContract.stateDeltaHashes[secretContract.stateDeltaHashes.length - 1];

        for (uint i = 0; i < _taskIds.length; i++) {
            // Verify the receipt
            //MOCK
            //verifyReceipt(_scAddr, _taskIds[i], _stateDeltaHashes[i], _gasesUsed[i], msg.sender, _sig);
            //inputsHashes[i] = tasks[_taskIds[i]].inputsHash;

            // Append the new state delta hash
            secretContract.stateDeltaHashes.push(_stateDeltaHashes[i]);
        }

        //  Set the contract's output hash
        secretContract.outputHash = _outputHash;

        //MOCK
        // Check worker's signature
        //        bytes32 msgHash = keccak256(abi.encodePacked(inputsHashes, secretContract.codeHash, _stateDeltaHashes,
        //            _outputHash, _gasesUsed, lastStateDeltaHash, true));
        //        require(msgHash.recover(_sig) == workers[msg.sender].signer, "Invalid signature");

        emit ReceiptsVerified(_taskIds, _stateDeltaHashes, _outputHash, _ethCall, _sig);
    }

    /**
    * Commit the computation task results on chain by first verifying the receipt and then the worker's signature.
    * After this, the task record is finalized and the worker is credited with the task's fee.
    *
    * @param _scAddr Secret contract address
    * @param _taskId Unique taskId
    * @param _gasUsed Gas used for task computation
    * @param _ethCall Eth call
    * @param _sig Worker's signature
    */
    function commitTaskFailure(
        bytes32 _scAddr,
        bytes32 _taskId,
        uint _gasUsed,
        bytes memory _ethCall,
        bytes memory _sig
    )
    public
    workerLoggedIn(msg.sender)
    contractDeployed(_scAddr)
    {
        SecretContract storage secretContract = contracts[_scAddr];
        bytes32 lastStateDeltaHash = secretContract.stateDeltaHashes[secretContract.stateDeltaHashes.length - 1];

        //MOCK
        TaskRecord storage task = tasks[_taskId];
        //require(task.status == TaskStatus.RecordCreated, 'Invalid task status');

        //MOCK
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        //require(msg.sender == getWorkerGroup(task.blockNumber, _scAddr)[0], "Not the selected worker for this task");

        //MOCK
        // Check that worker isn't charging the user too high of a fee
        //require(task.gasLimit >= _gasUsed, "Too much gas used for task");

        // Update proof and status attributes of TaskRecord
        task.proof = _sig;
        task.status = TaskStatus.ReceiptFailed;

        // Credit worker with the fees associated with this task
        workers[msg.sender].balance = workers[msg.sender].balance.add(_gasUsed.mul(task.gasPx));

        //MOCK
        // Credit the task sender with the unused gas fees
        //require(engToken.transfer(task.sender, (task.gasLimit.sub(_gasUsed)).mul(task.gasPx)),
        //    "Token transfer failed");

        bytes32 inputsHash = tasks[_taskId].inputsHash;

        //MOCK
        // Check worker's signature
//        bytes32 msgHash = keccak256(abi.encodePacked(inputsHash, secretContract.codeHash, _gasUsed, lastStateDeltaHash,
//            false));
//        require(msgHash.recover(_sig) == workers[msg.sender].signer, "Invalid signature");

        emit ReceiptFailed(_taskId, _ethCall, _sig);
    }

    function returnFeesForTask(bytes32 _taskId) public taskWaiting(_taskId) {
        TaskRecord storage task = tasks[_taskId];

        // Ensure that the timeout window has elapsed, allowing for a fee return
        require(block.number - task.blockNumber > taskTimeoutSize, "Task timeout window has not elapsed yet");

        // Return the full fee to the task sender
        require(engToken.transfer(task.sender, task.gasLimit.mul(task.gasPx)), "Token transfer failed");

        // Set task's status to ReceiptFailed and emit event
        task.status = TaskStatus.ReceiptFailed;
        emit TaskFeeReturned(_taskId);
    }

    // Verify the signature submitted while reparameterizing workers
    function verifyParamsSig(uint256 _seed, bytes memory _sig)
    internal
    pure
    returns (address)
    {
        bytes32 hash = keccak256(abi.encodePacked(_seed));
        address signer = hash.recover(_sig);
        return signer;
    }

    /**
    * Reparameterizing workers with a new seed
    * This should be called for each epoch by the Principal node
    *
    * @param _seed The random integer generated by the enclave
    * @param _sig The random integer signed by the the principal node's enclave
    */
    function setWorkersParams(uint _seed, bytes memory _sig)
    public
    workerRegistered(msg.sender)
    {
        // Reparameterizing workers with a new seed
        // This should be called for each epoch by the Principal node

        // We assume that the Principal is always the first registered node
        require(workers[msg.sender].signer == principal, "Only the Principal can update the seed");
        // TODO: verify the principal sig

        // Create a new workers parameters item for the specified seed.
        // The workers parameters list is a sort of cache, it never grows beyond its limit.
        // If the list is full, the new item will replace the item assigned to the lowest block number.
        uint paramIndex = 0;
        for (uint pi = 0; pi < workersParams.length; pi++) {
            // Find an empty slot in the array, if full use the lowest block number
            if (workersParams[pi].firstBlockNumber == 0) {
                paramIndex = pi;
                break;
            } else if (workersParams[pi].firstBlockNumber < workersParams[paramIndex].firstBlockNumber) {
                paramIndex = pi;
            }
        }
        workersParams[paramIndex].firstBlockNumber = block.number;
        workersParams[paramIndex].seed = _seed;
        workersParams[paramIndex].nonce = userTaskDeployments[msg.sender];

        // Copy the current worker list
        uint workerIndex = 0;
        for (uint wi = 0; wi < workerAddresses.length; wi++) {
            Worker memory worker = workers[workerAddresses[wi]];
            if ((worker.balance >= stakingThreshold) && (worker.signer != principal) &&
                (worker.status == WorkerStatus.LoggedIn)) {
                workersParams[paramIndex].workers.length++;
                workersParams[paramIndex].workers[workerIndex] = workerAddresses[wi];

                workersParams[paramIndex].balances.length++;
                workersParams[paramIndex].balances[workerIndex] = worker.balance;

                workerIndex = workerIndex.add(1);
            }
        }
        emit WorkersParameterized(_seed, block.number, workersParams[paramIndex].workers,
            workersParams[paramIndex].balances, userTaskDeployments[msg.sender]);
        userTaskDeployments[msg.sender]++;
    }

    function getWorkerParamsIndex(uint _blockNumber)
    internal
    view
    returns (uint)
    {
        // The workers parameters for a given block number
        int8 index = - 1;
        for (uint i = 0; i < workersParams.length; i++) {
            if (workersParams[i].firstBlockNumber <= _blockNumber && (index == - 1 || workersParams[i].firstBlockNumber > workersParams[uint(index)].firstBlockNumber)) {
                index = int8(i);
            }
        }
        require(index != - 1, "No workers parameters entry for specified block number");
        return uint(index);
    }

    function getParams(uint _blockNumber) internal view returns (WorkersParams memory) {
        uint index = getWorkerParamsIndex(_blockNumber);
        return workersParams[index];
    }

    function getFirstBlockNumber(uint _blockNumber)
    public
    view
    returns (uint) {
        WorkersParams memory params = getParams(_blockNumber);
        return params.firstBlockNumber;
    }

    function getWorkerParams(uint _blockNumber)
    public
    view
    returns (uint, uint, address[] memory, uint[] memory) {
        WorkersParams memory params = getParams(_blockNumber);
        return (params.firstBlockNumber, params.seed, params.workers, params.balances);
    }

    /**
    * Select a worker for the computation task pseudorandomly based on the epoch, secret contract address, and nonce
    *
    * @param _paramIndex Param index
    * @param _scAddr Secret contract address
    * @param _nonce Counter
    * @return Selected worker's address
    */
    function selectWeightedRandomWorker(uint _paramIndex, bytes32 _scAddr, uint _nonce)
    internal
    view
    returns (address)
    {
        WorkersParams memory params = workersParams[_paramIndex];
        uint tokenCpt = 0;
        for (uint i = 0; i < params.workers.length; i++) {
            if (params.workers[i] != address(0)) {
                tokenCpt = tokenCpt.add(params.balances[i]);
            }
        }
        bytes32 randHash = keccak256(abi.encodePacked(params.seed, _scAddr, _nonce));
        int randVal = int256(uint256(randHash) % tokenCpt);
        for (uint k = 0; k < params.workers.length; k++) {
            if (params.workers[k] != address(0)) {
                randVal -= int256(params.balances[k]);
                if (randVal <= 0) {
                    return params.workers[k];
                }
            }
        }
        return params.workers[params.workers.length - 1];
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
        // Compile a list of selected workers for the block number and
        // secret contract.
        uint paramIndex = getWorkerParamsIndex(_blockNumber);

        address[] memory selectedWorkers = new address[](workerGroupSize);
        uint nonce = 0;
        for (uint it = 0; it < workerGroupSize; it++) {
            do {
                address worker = selectWeightedRandomWorker(paramIndex, _scAddr, nonce);
                bool dup = false;
                for (uint id = 0; id < selectedWorkers.length; id++) {
                    if (worker == selectedWorkers[id]) {
                        dup = true;
                        break;
                    }
                }
                if (dup == false) {
                    selectedWorkers[it] = worker;
                }
                nonce++;
            }
            while (selectedWorkers[it] == address(0));
        }
        return selectedWorkers;
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
        // The RLP encoded report and signer's address for the specified worker
        require(workers[_custodian].signer != address(0), "Worker not registered");
        return (workers[_custodian].signer, workers[_custodian].report);
    }


    /**
    * This verifies an IAS report with hard coded modulus and exponent of Intel's certificate.
    * @param data The report itself
    * @param signature The signature of the report
    */
    function verifyReport(bytes memory data, bytes memory signature)
    public
    view
    returns (uint) {
        /*
        this is the modulus and the exponent of intel's certificate, you can extract it using:
        `openssl x509 -noout -modulus -in intel.cert`
        and `openssl x509 -in intel.cert  -text`
        */
        bytes memory exponent = hex"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010001";
        bytes memory modulus = hex"A97A2DE0E66EA6147C9EE745AC0162686C7192099AFC4B3F040FAD6DE093511D74E802F510D716038157DCAF84F4104BD3FED7E6B8F99C8817FD1FF5B9B864296C3D81FA8F1B729E02D21D72FFEE4CED725EFE74BEA68FBC4D4244286FCDD4BF64406A439A15BCB4CF67754489C423972B4A80DF5C2E7C5BC2DBAF2D42BB7B244F7C95BF92C75D3B33FC5410678A89589D1083DA3ACC459F2704CD99598C275E7C1878E00757E5BDB4E840226C11C0A17FF79C80B15C1DDB5AF21CC2417061FBD2A2DA819ED3B72B7EFAA3BFEBE2805C9B8AC19AA346512D484CFC81941E15F55881CC127E8F7AA12300CD5AFB5742FA1D20CB467A5BEB1C666CF76A368978B5";

        return SolRsaVerify.pkcs1Sha256VerifyRaw(data, signature, exponent, modulus);
    }
}
