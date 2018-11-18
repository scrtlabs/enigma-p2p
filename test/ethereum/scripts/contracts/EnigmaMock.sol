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

    struct Task {
        uint fee;
        address token;
        uint tokenValue;
        bytes proof; // Signature of (taskId, inStateDeltaHash, outStateDeltaHash, ethCall)
        address sender;
        TaskStatus status;
    }
    enum TaskStatus {RecordCreated, ReceiptVerified}

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
        uint8 status; // Uninitialized: 0; Active: 1; Inactive: 2
        bytes report; // Decided to store this as one  RLP encoded attribute for easier external storage in the future
        uint256 balance;
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
    mapping(bytes32 => Task) public tasks;
    mapping(address => SecretContract) public contracts;

    // TODO: do we keep tasks forever? if not, when do we delete them?
    uint stakingThreshold;
    uint workerGroupSize;

    // The events emitted by the contract
    event Registered(address custodian, address signer);
    event ValidatedSig(bytes sig, bytes32 hash, address workerAddr);
    event WorkersParameterized(uint seed, uint256 blockNumber, address[] workers, uint[] balances);
    event TaskRecordCreated(bytes32 taskId, uint fee, address token, uint tokenValue, address sender);
    event TaskRecordsCreated(bytes32[] taskIds, uint[] fees, address[] tokens, uint[] tokenValues, address sender);
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
    * @param user The custodian address of the worker
    */
    modifier workerRegistered(address user) {
        Worker memory worker = workers[user];
        require(worker.status > 0, "Unregistered worker.");
        _;
    }

    modifier contractDeployed(address scAddr) {
        require(contracts[scAddr].status == SecretContractStatus.Deployed, "Secret contract not deployed.");
        _;
    }

    /**
    * Registers a new worker of change the signer parameters of an existing
    * worker. This should be called by every worker (and the principal)
    * node in order to receive tasks.
    *
    * @param signer The signer address, derived from the enclave public key
    * @param report The RLP encoded report returned by the IAS
    */
    function register(address signer, bytes report)
    public
    {
        // TODO: consider exit if both signer and custodian as matching
        // If the custodian is not already register, we add an index entry
        if (workers[msg.sender].signer == 0x0) {
            // TODO: does workerAddresses.push just work here?
            uint index = workerAddresses.length;
            workerAddresses.length++;
            workerAddresses[index] = msg.sender;
        }

        // Set the custodian attributes
        workers[msg.sender].signer = signer;
        workers[msg.sender].balance = 0;
        workers[msg.sender].report = report;
        workers[msg.sender].status = 1;

        emit Registered(msg.sender, signer);
    }

    function deposit(address custodian, uint amount)
    public
    workerRegistered(custodian)
    {
        //        require(engToken.allowance(custodian, to) >= amount, "Not enough tokens allowed for transfer");
        //        engToken.transferFrom(custodian, this, amount);

        workers[custodian].balance = workers[custodian].balance.add(amount);

        emit DepositSuccessful(custodian, amount);
    }

    // TODO: should the scAddr be computed on-chain from the codeHash + some randomness
    // TODO: should any user deploy a secret contract or only a trusted enclave?
    function deploySecretContract(address scAddr, bytes32 codeHash, address owner, bytes sig)
    public
    workerRegistered(msg.sender)
    {
        require(contracts[scAddr].status == SecretContractStatus.Undefined, "Secret contract already deployed.");
        //TODO: verify sig

        //TODO: is this too naive?
        contracts[scAddr].owner = owner;
        contracts[scAddr].codeHash = codeHash;
        contracts[scAddr].status = SecretContractStatus.Deployed;
        scAddresses.push(scAddr);

        emit SecretContractDeployed(scAddr, codeHash);
    }

    function isDeployed(address scAddr)
    public
    view
    returns (bool)
    {
        if (contracts[scAddr].status == SecretContractStatus.Deployed) {
            return true;
        } else {
            return false;
        }
    }

    function getCodeHash(address scAddr)
    public
    view
    contractDeployed(scAddr)
    returns (bytes32)
    {
        return contracts[scAddr].codeHash;
    }

    function countSecretContracts()
    public
    view
    returns (uint)
    {
        return scAddresses.length;
    }

    /**
    * Selects address from start up to, but not including, the stop number
    **/
    function getSecretContractAddresses(uint start, uint stop)
    public
    view
    returns (address[])
    {
        if (stop == 0) {
            stop = scAddresses.length;
        }
        address[] memory addresses = new address[](stop.sub(start));
        uint pos = 0;
        for (uint i = start; i < stop; i++) {
            addresses[pos] = scAddresses[i];
        }
        return addresses;
    }

    function countStateDeltas(address scAddr)
    public
    view
    contractDeployed(scAddr)
    returns (uint)
    {
        return contracts[scAddr].stateDeltaHashes.length;
    }

    function getStateDeltaHash(address scAddr, uint index)
    public
    view
    contractDeployed(scAddr)
    returns (bytes32)
    {
        return contracts[scAddr].stateDeltaHashes[index];
    }

    /**
    * Selects state deltas from start up to, but not including, the stop number
    **/
    function getStateDeltaHashes(address scAddr, uint start, uint stop)
    public
    view
    contractDeployed(scAddr)
    returns (bytes32[])
    {
        if (stop == 0) {
            stop = contracts[scAddr].stateDeltaHashes.length;
        }
        bytes32[] memory deltas = new bytes32[](stop.sub(start));
        uint pos = 0;
        for (uint i = start; i < stop; i++) {
            deltas[pos] = contracts[scAddr].stateDeltaHashes[i];
            pos++;
        }
        return deltas;
    }

    function isValidDeltaHash(address scAddr, bytes32 stateDeltaHash)
    public
    view
    contractDeployed(scAddr)
    returns (bool)
    {
        bool valid = false;
        for (uint i = 0; i < contracts[scAddr].stateDeltaHashes.length; i++) {
            if (contracts[scAddr].stateDeltaHashes[i] == stateDeltaHash) {
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
        bytes32 taskId,
        uint fee,
        address token,
        uint tokenValue
    )
    public
    {
        require(tasks[taskId].sender == 0x0, "Task already exist.");

        tasks[taskId].fee = fee;
        tasks[taskId].token = token;
        tasks[taskId].tokenValue = tokenValue;
        tasks[taskId].sender = msg.sender;
        tasks[taskId].status = TaskStatus.RecordCreated;

        emit TaskRecordCreated(taskId, fee, token, tokenValue, msg.sender);
    }

    function createTaskRecords(
        bytes32[] taskIds,
        uint[] fees,
        address[] tokens,
        uint[] tokenValues
    )
    public
    {
        for (uint i = 0; i < taskIds.length; i++) {
            require(tasks[taskIds[i]].sender == 0x0, "Task already exist.");

            tasks[taskIds[i]].fee = fees[i];
            tasks[taskIds[i]].token = tokens[i];
            tasks[taskIds[i]].tokenValue = tokenValues[i];
            tasks[taskIds[i]].sender = msg.sender;
            tasks[taskIds[i]].status = TaskStatus.RecordCreated;
        }
        emit TaskRecordsCreated(taskIds, fees, tokens, tokenValues, msg.sender);
    }

    // Execute the encoded function in the specified contract
    function executeCall(address to, uint256 value, bytes data)
    internal
    returns (bool success)
    {
        assembly {
            success := call(gas, to, value, add(data, 0x20), mload(data), 0, 0)
        }
    }

    function verifyReceipt(
        address scAddr,
        bytes32 taskId,
        bytes32 inStateDeltaHash,
        bytes32 outStateDeltaHash,
        bytes ethCall,
        bytes sig
    )
    internal
    {
        uint index = contracts[scAddr].stateDeltaHashes.length;
        if (index == 0) {
            require(inStateDeltaHash == 0x0, 'Invalid input state delta hash for empty state');
        } else {
            require(inStateDeltaHash == contracts[scAddr].stateDeltaHashes[index.sub(1)], 'Invalid input state delta hash');
        }
        contracts[scAddr].stateDeltaHashes.push(outStateDeltaHash);

        // TODO: execute the Ethereum calls

        // Build a hash to validate that the I/Os are matching
        //MOCK
        //bytes32 hash = keccak256(abi.encodePacked(taskId, inStateDeltaHash, outStateDeltaHash, ethCall));

        // The worker address is not a real Ethereum wallet address but
        // one generated from its signing key
        //MOCK
        //address workerAddr = hash.recover(sig);
        //require(workerAddr == workers[msg.sender].signer, "Invalid signature.");
    }

    /**
    * Commit the computation task results on chain
    */
    function commitReceipt(
        address scAddr,
        bytes32 taskId,
        bytes32 inStateDeltaHash,
        bytes32 outStateDeltaHash,
        bytes ethCall,
        bytes sig
    )
    public
    workerRegistered(msg.sender)
    contractDeployed(scAddr)
    {
        require(tasks[taskId].status == TaskStatus.RecordCreated, 'Invalid task status');
        verifyReceipt(scAddr, taskId, inStateDeltaHash, outStateDeltaHash, ethCall, sig);

        tasks[taskId].proof = sig;
        tasks[taskId].status = TaskStatus.ReceiptVerified;
        emit ReceiptVerified(taskId, inStateDeltaHash, outStateDeltaHash, ethCall, sig);
    }

    function verifyReceipts(
        address scAddr,
        bytes32[] taskIds,
        bytes32[] inStateDeltaHashes,
        bytes32[] outStateDeltaHashes,
        bytes ethCall,
        bytes sig
    )
    internal
    {
        // First, we verify the state delta hashes ordering
        uint index = contracts[scAddr].stateDeltaHashes.length;
        if (index == 0) {
            require(inStateDeltaHashes[0] == 0x0, 'Invalid input state delta hash for empty state');
        } else {
            require(inStateDeltaHashes[0] == contracts[scAddr].stateDeltaHashes[index.sub(1)], 'Invalid input state delta hash');
        }
        for (uint i = 0; i < taskIds.length; i++) {
            require(tasks[taskIds[i]].status == TaskStatus.RecordCreated, 'Invalid task status');
            if (i > 0) {
                require(inStateDeltaHashes[i] == outStateDeltaHashes[i - 1], 'Invalid state delta hashes ordering');
            }
        }
        // TODO: verify signature
        // Then, we store the outStateDeltaHashes
        for (uint ic = 0; ic < taskIds.length; ic++) {
            contracts[scAddr].stateDeltaHashes.push(outStateDeltaHashes[ic]);
            if (ic == taskIds.length.sub(1)) {
                tasks[taskIds[ic]].proof = sig;
            }
            tasks[taskIds[ic]].status = TaskStatus.ReceiptVerified;
        }
        // TODO: execute the Ethereum calls
    }

    function commitReceipts(
        address scAddr,
        bytes32[] taskIds,
        bytes32[] inStateDeltaHashes,
        bytes32[] outStateDeltaHashes,
        bytes ethCall,
        bytes sig
    )
    public
    workerRegistered(msg.sender)
    contractDeployed(scAddr)
    {
        verifyReceipts(scAddr, taskIds, inStateDeltaHashes, outStateDeltaHashes, ethCall, sig);
        emit ReceiptsVerified(taskIds, inStateDeltaHashes, outStateDeltaHashes, ethCall, sig);
    }

    // Verify the signature submitted while reparameterizing workers
    function verifyParamsSig(uint256 seed, bytes sig)
    internal
    pure
    returns (address)
    {
        bytes32 hash = keccak256(abi.encodePacked(seed));
        address signer = hash.recover(sig);
        return signer;
    }

    /**
    * Reparameterizing workers with a new seed
    * This should be called for each epoch by the Principal node
    *
    * @param seed The random integer generated by the enclave
    * @param sig The random integer signed by the the principal node's enclave
    */
    function setWorkersParams(uint seed, bytes sig)
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
        workersParams[paramIndex].seed = seed;

        // Copy the current worker list
        uint workerIndex = 0;
        for (uint wi = 0; wi < workerAddresses.length; wi++) {
            if (workers[workerAddresses[wi]].balance >= stakingThreshold) {
                workersParams[paramIndex].workers.length++;
                workersParams[paramIndex].workers[workerIndex] = workerAddresses[wi];

                workersParams[paramIndex].balances.length++;
                workersParams[paramIndex].balances[workerIndex] = workers[workerAddresses[wi]].balance;

                workerIndex = workerIndex.add(1);
            }
        }
        emit WorkersParameterized(seed, block.number, workersParams[paramIndex].workers, workersParams[paramIndex].balances);
    }

    function getWorkerParamsIndex(uint blockNumber)
    internal
    view
    returns (uint)
    {
        // The workers parameters for a given block number
        int8 index = - 1;
        for (uint i = 0; i < workersParams.length; i++) {
            if (workersParams[i].firstBlockNumber <= blockNumber && (index == - 1 || workersParams[i].firstBlockNumber > workersParams[uint(index)].firstBlockNumber)) {
                index = int8(i);
            }
        }
        require(index != - 1, "No workers parameters entry for specified block number");
        return uint(index);
    }

    function getWorkerParams(uint blockNumber)
    public
    view
    returns (uint, uint, address[], uint[]) {
        uint index = getWorkerParamsIndex(blockNumber);
        WorkersParams memory params = workersParams[index];
        return (params.firstBlockNumber, params.seed, params.workers, params.balances);
    }

    function compileTokens(uint paramIndex)
    internal
    view
    returns (address[])
    {
        WorkersParams memory params = workersParams[paramIndex];
        uint tokenCpt = 0;
        for (uint i = 0; i < params.workers.length; i++) {
            if (params.workers[i] != 0x0) {
                tokenCpt = tokenCpt.add(params.balances[i]);
            }
        }
        address[] memory tokens = new address[](tokenCpt);
        uint tokenIndex = 0;
        for (uint ia = 0; ia < params.workers.length; ia++) {
            if (params.workers[ia] != 0x0) {
                for (uint ib = 0; ib < params.balances[ia]; ib++) {
                    tokens[tokenIndex] = params.workers[ia];
                    tokenIndex = tokenIndex.add(1);
                }
            }
        }
        return tokens;
    }

    function getWorkerGroup(uint blockNumber, address scAddr)
    public
    view
    returns (address[])
    {
        // Compile a list of selected workers for the block number and
        // secret contract.
        uint paramIndex = getWorkerParamsIndex(blockNumber);
        address[] memory tokens = compileTokens(paramIndex);
        WorkersParams memory params = workersParams[paramIndex];

        address[] memory selectedWorkers = new address[](workerGroupSize);
        uint nonce = 0;
        for (uint it = 0; it < workerGroupSize; it++) {
            do {
                bytes32 hash = keccak256(abi.encodePacked(nonce, params.seed, params.firstBlockNumber, scAddr));
                uint index = uint256(hash) % tokens.length;
                address worker = tokens[index];
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
    * @param blockNumber The reference block number
    */
    function getWorkersParams(uint blockNumber)
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
    * @param custodian The worker's custodian address
    */
    function getReport(address custodian)
    public
    view
    workerRegistered(custodian)
    returns (address, bytes)
    {
        // The RLP encoded report and signer's address for the specified worker
        require(workers[custodian].signer != 0x0, "Worker not registered");
        return (workers[custodian].signer, workers[custodian].report);
    }
}