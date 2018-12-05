pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ECRecovery.sol";

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
    using ECRecovery for bytes32;

    // The interface of the deployed ENG ERC20 token contract
    ERC20 public engToken;

    uint public epochSize = 100;

    struct TaskRecord {
        uint fee;
        bytes proof; // Signature of (taskId, inStateDeltaHash, outStateDeltaHash, ethCall)
        address sender;
        TaskStatus status;
    }
    enum TaskStatus {RecordUndefined, RecordCreated, ReceiptVerified}

    /**
    * The signer address of the principal node
    * This must be set when deploying the contract and remains immutable
    * Since the signer address is derived from the public key of an
    * SGX enclave, this ensures that the principal node cannot be tempered
    * with or replaced.
    */
    address principal;

    // The data representation of a worker (or node)
    struct Worker {
        address signer;
        WorkerStatus status; // Uninitialized: 0; Active: 1; Inactive: 2
        bytes report; // Decided to store this as one  RLP encoded attribute for easier external storage in the future
        uint256 balance;
    }

    enum WorkerStatus {Unregistered, Registered, LoggedIn, LoggedOut}

    /**
    * The data representation of the worker parameters used as input for
    * the worker selection algorithm
    */
    struct WorkersParams {
        uint firstBlockNumber;
        address[] workers;
        uint[] balances;
        uint seed;
    }

    struct SecretContract {
        address owner;
        bytes32 codeHash;
        bytes32[] stateDeltaHashes;
        SecretContractStatus status;
        // TODO: consider keeping an index of taskIds
    }
    // TODO: do we want to have a contract lifecycle?
    enum SecretContractStatus {Undefined, Deployed}

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
    address[] public scAddresses;

    // A registry of all registered workers with their attributes
    mapping(address => Worker) public workers;
    mapping(bytes32 => TaskRecord) public tasks;
    mapping(address => SecretContract) public contracts;

    // A mapping of number of secret contract deployments for each address
    mapping(address => uint) public userSCDeployments;

    // TODO: do we keep tasks forever? if not, when do we delete them?
    uint stakingThreshold;
    uint public workerGroupSize;

    // The events emitted by the contract
    event Registered(address custodian, address signer);
    event ValidatedSig(bytes sig, bytes32 hash, address workerAddr);
    event WorkersParameterized(uint seed, uint256 blockNumber, address[] workers, uint[] balances);
    event TaskRecordCreated(bytes32 taskId, uint fee, address sender);
    event TaskRecordsCreated(bytes32[] taskIds, uint[] fees, address sender);
    event ReceiptVerified(bytes32 taskId, bytes32 inStateDeltaHash, bytes32 outStateDeltaHash, bytes ethCall, bytes sig);
    event ReceiptsVerified(bytes32[] taskIds, bytes32[] inStateDeltaHashes, bytes32[] outStateDeltaHashes, bytes ethCall, bytes sig);
    event DepositSuccessful(address from, uint value);
    event SecretContractDeployed(address scAddr, bytes32 codeHash);

    constructor(address _tokenAddress, address _principal) public {
        engToken = ERC20(_tokenAddress);
        principal = _principal;
        stakingThreshold = 1;
        workerGroupSize = 5;
    }

    //TODO: break down these methods into services for upgradability

    /**
    * Checks if the custodian wallet is registered as a worker
    *
    * @param _user The custodian address of the worker
    */
    modifier workerRegistered(address _user) {
        Worker memory worker = workers[_user];
        require(worker.status != WorkerStatus.Unregistered, "Unregistered worker.");
        _;
    }

    /**
    * Checks if the custodian wallet is logged in as a worker
    *
    * @param _user The custodian address of the worker
    */
    modifier workerLoggedIn(address _user) {
        Worker memory worker = workers[_user];
        require(worker.status == WorkerStatus.LoggedIn, "Worker not logged in.");
        _;
    }

    modifier contractDeployed(address _scAddr) {
        require(contracts[_scAddr].status == SecretContractStatus.Deployed, "Secret contract not deployed.");
        _;
    }

    /**
    * Registers a new worker of change the signer parameters of an existing
    * worker. This should be called by every worker (and the principal)
    * node in order to receive tasks.
    *
    * @param _signer The signer address, derived from the enclave public key
    * @param _report The RLP encoded report returned by the IAS
    */
    function register(address _signer, bytes _report)
    public
    {
        // TODO: consider exit if both signer and custodian as matching
        // If the custodian is not already register, we add an index entry
        if (workers[msg.sender].signer == 0x0) {
            workerAddresses.push(msg.sender);
        }

        // Set the custodian attributes
        workers[msg.sender].signer = _signer;
        workers[msg.sender].balance = 0;
        workers[msg.sender].report = _report;
        workers[msg.sender].status = WorkerStatus.Registered;

        emit Registered(msg.sender, _signer);
    }

    function deposit(address _custodian, uint _amount)
    public
    workerRegistered(_custodian)
    {
        //MOCK
        //require(engToken.allowance(_custodian, this) >= _amount, "Not enough tokens allowed for transfer");
        //require(engToken.transferFrom(_custodian, this, _amount));

        workers[_custodian].balance = workers[_custodian].balance.add(_amount);

        emit DepositSuccessful(_custodian, _amount);
    }

    function login() public workerRegistered(msg.sender) {
        workers[msg.sender].status = WorkerStatus.LoggedIn;
    }

    function logout() public workerLoggedIn(msg.sender) {
        workers[msg.sender].status = WorkerStatus.LoggedOut;
    }

    // TODO: should the scAddr be computed on-chain from the codeHash + some randomness
    // TODO: should any user deploy a secret contract or only a trusted enclave?
    function deploySecretContract(address _scAddr, bytes32 _codeHash, address _owner, bytes _sig)
    public
    workerRegistered(msg.sender)
    {
        //MOCK
        //address scAddr = address(keccak256(abi.encodePacked(_codeHash, _owner, userSCDeployments[_owner])));
        //require(scAddr == _scAddr);
        require(contracts[_scAddr].status == SecretContractStatus.Undefined, "Secret contract already deployed.");
        //TODO: verify sig

        //TODO: is this too naive?
        contracts[_scAddr].owner = _owner;
        contracts[_scAddr].codeHash = _codeHash;
        contracts[_scAddr].status = SecretContractStatus.Deployed;
        scAddresses.push(_scAddr);
        userSCDeployments[_owner]++;
        //MOCK
        emit SecretContractDeployed(_scAddr, _codeHash);
    }

    function isDeployed(address _scAddr)
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

    function getCodeHash(address _scAddr)
    public
    view
    contractDeployed(_scAddr)
    returns (bytes32)
    {
        return contracts[_scAddr].codeHash;
    }

    function countSecretContracts()
    public
    view
    returns (uint)
    {
        return scAddresses.length;
    }

    /**
    * Selects address from _start up to, but not including, the _stop number
    **/
    function getSecretContractAddresses(uint _start, uint _stop)
    public
    view
    returns (address[])
    {
        if (_stop == 0) {
            _stop = scAddresses.length;
        }
        address[] memory addresses = new address[](_stop.sub(_start));
        uint pos = 0;
        for (uint i = _start; i < _stop; i++) {
            addresses[pos] = scAddresses[i];
            pos++;
        }
        return addresses;
    }

    function countStateDeltas(address _scAddr)
    public
    view
    contractDeployed(_scAddr)
    returns (uint)
    {
        return contracts[_scAddr].stateDeltaHashes.length;
    }

    function getStateDeltaHash(address _scAddr, uint _index)
    public
    view
    contractDeployed(_scAddr)
    returns (bytes32)
    {
        return contracts[_scAddr].stateDeltaHashes[_index];
    }

    /**
    * Selects state deltas from _start up to, but not including, the _stop number
    **/
    function getStateDeltaHashes(address _scAddr, uint _start, uint _stop)
    public
    view
    contractDeployed(_scAddr)
    returns (bytes32[])
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

    function isValidDeltaHash(address _scAddr, bytes32 _stateDeltaHash)
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
    * Store task record
    *
    */
    function createTaskRecord(
        bytes32 _taskId,
        uint _fee
    )
    public
    {
        require(tasks[_taskId].sender == 0x0, "Task already exist.");

        tasks[_taskId].fee = _fee;
        tasks[_taskId].sender = msg.sender;
        tasks[_taskId].status = TaskStatus.RecordCreated;

        emit TaskRecordCreated(_taskId, _fee, msg.sender);
    }

    function createTaskRecords(
        bytes32[] _taskIds,
        uint[] _fees
    )
    public
    {
        for (uint i = 0; i < _taskIds.length; i++) {
            require(tasks[_taskIds[i]].sender == 0x0, "Task already exist.");

            tasks[_taskIds[i]].fee = _fees[i];
            tasks[_taskIds[i]].sender = msg.sender;
            tasks[_taskIds[i]].status = TaskStatus.RecordCreated;
        }
        emit TaskRecordsCreated(_taskIds, _fees, msg.sender);
    }

    // Execute the encoded function in the specified contract
    function executeCall(address _to, uint256 _value, bytes _data)
    internal
    returns (bool success)
    {
        assembly {
            success := call(gas, _to, _value, add(_data, 0x20), mload(_data), 0, 0)
        }
    }

    function verifyReceipt(
        address _scAddr,
        bytes32 _taskId,
        bytes32 _inStateDeltaHash,
        bytes32 _outStateDeltaHash,
        bytes _ethCall,
        bytes _sig
    )
    internal
    {
        uint index = contracts[_scAddr].stateDeltaHashes.length;
        if (index == 0) {
            require(_inStateDeltaHash == 0x0, 'Invalid input state delta hash for empty state');
        } else {
            require(_inStateDeltaHash == contracts[_scAddr].stateDeltaHashes[index.sub(1)], 'Invalid input state delta hash');
        }
        contracts[_scAddr].stateDeltaHashes.push(_outStateDeltaHash);

        // TODO: execute the Ethereum calls

        // Build a hash to validate that the I/Os are matching
        //MOCK
        //bytes32 hash = keccak256(abi.encodePacked(_taskId, _inStateDeltaHash, _outStateDeltaHash, _ethCall));

        // The worker address is not a real Ethereum wallet address but
        // one generated from its signing key
        //MOCK
        //address workerAddr = hash.recover(_sig);
        //require(workerAddr == workers[msg.sender].signer, "Invalid signature.");
    }

    /**
    * Commit the computation task results on chain
    */
    function commitReceipt(
        address _scAddr,
        bytes32 _taskId,
        bytes32 _inStateDeltaHash,
        bytes32 _outStateDeltaHash,
        bytes _ethCall,
        bytes _sig
    )
    public
    workerLoggedIn(msg.sender)
    contractDeployed(_scAddr)
    {
        require(tasks[_taskId].status == TaskStatus.RecordCreated, 'Invalid task status');
        verifyReceipt(_scAddr, _taskId, _inStateDeltaHash, _outStateDeltaHash, _ethCall, _sig);

        tasks[_taskId].proof = _sig;
        tasks[_taskId].status = TaskStatus.ReceiptVerified;
        emit ReceiptVerified(_taskId, _inStateDeltaHash, _outStateDeltaHash, _ethCall, _sig);
    }

    function verifyReceipts(
        address _scAddr,
        bytes32[] _taskIds,
        bytes32[] _inStateDeltaHashes,
        bytes32[] _outStateDeltaHashes,
        bytes _ethCall,
        bytes _sig
    )
    internal
    {
        // First, we verify the state delta hashes ordering
        uint index = contracts[_scAddr].stateDeltaHashes.length;
        if (index == 0) {
            require(_inStateDeltaHashes[0] == 0x0, 'Invalid input state delta hash for empty state');
        } else {
            require(_inStateDeltaHashes[0] == contracts[_scAddr].stateDeltaHashes[index.sub(1)], 'Invalid input state delta hash');
        }
        for (uint i = 0; i < _taskIds.length; i++) {
            require(tasks[_taskIds[i]].status == TaskStatus.RecordCreated, 'Invalid task status');
            if (i > 0) {
                require(_inStateDeltaHashes[i] == _outStateDeltaHashes[i - 1], 'Invalid state delta hashes ordering');
            }
        }
        // TODO: verify signature
        // Then, we store the outStateDeltaHashes
        for (uint ic = 0; ic < _taskIds.length; ic++) {
            contracts[_scAddr].stateDeltaHashes.push(_outStateDeltaHashes[ic]);
            if (ic == _taskIds.length.sub(1)) {
                tasks[_taskIds[ic]].proof = _sig;
            }
            tasks[_taskIds[ic]].status = TaskStatus.ReceiptVerified;
        }
        // TODO: execute the Ethereum calls
    }

    function commitReceipts(
        address _scAddr,
        bytes32[] _taskIds,
        bytes32[] _inStateDeltaHashes,
        bytes32[] _outStateDeltaHashes,
        bytes _ethCall,
        bytes _sig
    )
    public
    workerLoggedIn(msg.sender)
    contractDeployed(_scAddr)
    {
        verifyReceipts(_scAddr, _taskIds, _inStateDeltaHashes, _outStateDeltaHashes, _ethCall, _sig);
        emit ReceiptsVerified(_taskIds, _inStateDeltaHashes, _outStateDeltaHashes, _ethCall, _sig);
    }

    // Verify the signature submitted while reparameterizing workers
    function verifyParamsSig(uint256 _seed, bytes _sig)
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
    function setWorkersParams(uint _seed, bytes _sig)
    public
    workerLoggedIn(msg.sender)
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
        emit WorkersParameterized(_seed, block.number, workersParams[paramIndex].workers, workersParams[paramIndex].balances);
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

    function getWorkerParams(uint _blockNumber)
    public
    view
    returns (uint, uint, address[], uint[]) {
        uint index = getWorkerParamsIndex(_blockNumber);
        WorkersParams memory params = workersParams[index];
        return (params.firstBlockNumber, params.seed, params.workers, params.balances);
    }

    function compileTokens(uint _blockNumber, uint _paramIndex, address _scAddr, uint _nonce)
    internal
    view
    returns (address)
    {
        WorkersParams memory params = workersParams[_paramIndex];
        uint tokenCpt = 0;
        for (uint i = 0; i < params.workers.length; i++) {
            if (params.workers[i] != 0x0) {
                tokenCpt = tokenCpt.add(params.balances[i]);
            }
        }
        bytes32 randHash = keccak256(abi.encodePacked(_blockNumber, params.seed, params.firstBlockNumber, _scAddr,
            tokenCpt, _nonce));
        int randVal = int256(uint256(randHash) % tokenCpt);
        for (uint k = 0; k < params.workers.length; k++) {
            if (params.workers[k] != 0x0) {
                randVal -= int256(params.balances[k]);
                if (randVal <= 0) {
                    return params.workers[k];
                }
            }
        }
        return params.workers[params.workers.length - 1];
    }

    function getWorkerGroup(uint _blockNumber, address _scAddr)
    public
    view
    returns (address[])
    {
        // Compile a list of selected workers for the block number and
        // secret contract.
        uint paramIndex = getWorkerParamsIndex(_blockNumber);
        WorkersParams memory params = workersParams[paramIndex];

        address[] memory selectedWorkers = new address[](workerGroupSize);
        uint nonce = 0;
        for (uint it = 0; it < workerGroupSize; it++) {
            do {
                address worker = compileTokens(_blockNumber, paramIndex, _scAddr, nonce);
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
            while (selectedWorkers[it] == 0x0);
        }
        return selectedWorkers;
    }

    /**
    * The worker parameters corresponding to the specified block number
    *
    * @param _blockNumber The reference block number
    */
    function getWorkersParams(uint _blockNumber)
    public
    view
    returns (uint, uint, address[], address[])
    {
        // TODO: finalize implementation
        uint firstBlockNumber = 0;
        uint seed = 0;
        address[] memory activeWorkers;
        address[] memory activeContracts;
        return (firstBlockNumber, seed, activeWorkers, activeContracts);
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
    returns (address, bytes)
    {
        // The RLP encoded report and signer's address for the specified worker
        require(workers[_custodian].signer != 0x0, "Worker not registered");
        return (workers[_custodian].signer, workers[_custodian].report);
    }
}