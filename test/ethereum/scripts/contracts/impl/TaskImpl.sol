pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

import { EnigmaCommon } from "./EnigmaCommon.sol";
import { EnigmaState } from "./EnigmaState.sol";
import { WorkersImpl } from "./WorkersImpl.sol";
import { Bytes } from "../utils/Bytes.sol";
import "../utils/SolRsaVerify.sol";

/**
 * @author Enigma
 *
 * Library that maintains functionality associated with tasks
 */
library TaskImpl {
    using SafeMath for uint256;
    using ECDSA for bytes32;
    using Bytes for bytes;
    using Bytes for bytes32;
    using Bytes for uint64;
    using Bytes for address;

    event TaskRecordCreated(bytes32 taskId, bytes32 inputsHash, uint gasLimit, uint gasPx, address sender,
        uint blockNumber);
    event TaskRecordsCreated(bytes32[] taskIds, bytes32[] inputsHashes, uint[] gasLimits, uint[] gasPxs, address sender,
        uint blockNumber);
    event SecretContractDeployed(bytes32 scAddr, bytes32 codeHash, bytes32 initStateDeltaHash);
    event ReceiptVerified(bytes32 taskId, bytes32 stateDeltaHash, bytes32 outputHash, uint deltaHashIndex,
        bytes optionalEthereumData, address optionalEthereumContractAddress, bytes sig);
    event ReceiptsVerified(bytes32[] taskIds, bytes32[] stateDeltaHashes, bytes32[] outputHashes,
        bytes _optionalEthereumData, address optionalEthereumContractAddress, bytes sig);
    event ReceiptFailed(bytes32 taskId, bytes sig);
    event TaskFeeReturned(bytes32 taskId);

    function createDeploymentTaskRecordImpl(
        EnigmaState.State storage state,
        bytes32 _inputsHash,
        uint _gasLimit,
        uint _gasPx,
        uint _firstBlockNumber,
        uint _nonce
    )
    public
    {
        // Check that the locally-generated nonce matches the on-chain value, otherwise _scAddr is invalid
        require(state.userTaskDeployments[msg.sender] == _nonce, "Incorrect nonce yielding bad secret contract address");

        // MOCK
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        //require(_firstBlockNumber == WorkersImpl.getFirstBlockNumberImpl(state, block.number), "Wrong epoch for this task");

        // Transfer fee from sender to contract
        uint fee = _gasLimit.mul(_gasPx);
        // MOCK
        //require(state.engToken.allowance(msg.sender, address(this)) >= fee, "Allowance not enough");
        //require(state.engToken.transferFrom(msg.sender, address(this), fee), "Transfer not valid");

        //MOCK
        bytes32 taskId = 0xf29647ec8920b552fa96de8cc3129b5ba70471b190c8ec5a4793467f12ad84e9;//_nonce;
        // Create taskId and TaskRecord
        //bytes32 taskId = keccak256(abi.encodePacked(msg.sender, state.userTaskDeployments[msg.sender]));
        EnigmaCommon.TaskRecord storage task = state.tasks[taskId];
        require(task.sender == address(0), "Task already exists");
        task.inputsHash = _inputsHash;
        task.gasLimit = _gasLimit;
        task.gasPx = _gasPx;
        task.sender = msg.sender;
        task.blockNumber = block.number;
        task.status = EnigmaCommon.TaskStatus.RecordCreated;

        // Increment user task deployment nonce
        state.userTaskDeployments[msg.sender]++;

        emit TaskRecordCreated(taskId, _inputsHash, _gasLimit, _gasPx, msg.sender, block.number);
    }

    function deploySecretContractFailureImpl(EnigmaState.State storage state, bytes32 _taskId, uint64 _gasUsed,
        bytes memory _sig)
    public
    {
        EnigmaCommon.TaskRecord storage task = state.tasks[_taskId];
        // MOCK
        //require(task.status == EnigmaCommon.TaskStatus.RecordCreated, 'Invalid task status');

        EnigmaCommon.Worker memory worker = state.workers[msg.sender];
        // MOCK
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        //require(worker.signer == WorkersImpl.getWorkerGroupImpl(state, task.blockNumber, _taskId)[0],
        //    "Not the selected worker for this task");

        // MOCK
        // Check that worker isn't charging the user too high of a fee
        //require(task.gasLimit >= _gasUsed, "Too much gas used for task");

        // Update proof and status attributes of TaskRecord
        task.proof = _sig;
        task.status = EnigmaCommon.TaskStatus.ReceiptFailed;

        //MOCK
        //transferFundsAfterTask(state, msg.sender, task.sender, _gasUsed, task.gasLimit.sub(_gasUsed), task.gasPx);

        // Verify the worker's signature
        bytes memory message;
        message = EnigmaCommon.appendMessage(message, task.inputsHash.toBytes());
        message = EnigmaCommon.appendMessage(message, _gasUsed.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, hex"00");
        bytes32 msgHash = keccak256(message);
        // MOCK
        //require(msgHash.recover(_sig) == state.workers[msg.sender].signer, "Invalid signature");

        emit ReceiptFailed(_taskId, _sig);
    }

    function verifyDeployReceipt(EnigmaState.State storage state, bytes32 _taskId, uint _gasUsed, address _sender,
        bytes memory _sig)
    internal
    {
        EnigmaCommon.TaskRecord storage task = state.tasks[_taskId];
        require(task.status == EnigmaCommon.TaskStatus.RecordCreated, 'Invalid task status');

        EnigmaCommon.Worker memory worker = state.workers[_sender];
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        require(worker.signer == WorkersImpl.getWorkerGroupImpl(state, task.blockNumber, _taskId)[0],
            "Not the selected worker for this task");

        // Check that worker isn't charging the user too high of a fee
        require(task.gasLimit >= _gasUsed, "Too much gas used for task");

        // Update proof and status attributes of TaskRecord
        task.proof = _sig;
        task.status = EnigmaCommon.TaskStatus.ReceiptVerified;

        transferFundsAfterTask(state, _sender, task.sender, _gasUsed, task.gasLimit.sub(_gasUsed), task.gasPx);
    }

    function deploySecretContractImpl(EnigmaState.State storage state, bytes32 _taskId, bytes32 _preCodeHash,
        bytes32 _codeHash, bytes32 _initStateDeltaHash, bytes memory _optionalEthereumData,
        address _optionalEthereumContractAddress, uint64 _gasUsed, bytes memory _sig)
    public
    {
        // MOCK
        //verifyDeployReceipt(state, _taskId, _gasUsed, msg.sender, _sig);
        EnigmaCommon.TaskRecord memory task = state.tasks[_taskId];

        // MOCK
        // Verify the worker's signature
        //bytes memory message;
        //message = EnigmaCommon.appendMessage(message, task.inputsHash.toBytes());
        //message = EnigmaCommon.appendMessage(message, _codeHash.toBytes());
        //message = EnigmaCommon.appendMessage(message, _initStateDeltaHash.toBytes());
        //message = EnigmaCommon.appendMessage(message, _gasUsed.toBytesFromUint64());
        //message = EnigmaCommon.appendMessage(message, _optionalEthereumData);
        //message = EnigmaCommon.appendMessage(message, _optionalEthereumContractAddress.toBytes());
        //message = EnigmaCommon.appendMessage(message, hex"01");
        //bytes32 msgHash = keccak256(message);
        //require(msgHash.recover(_sig) == state.workers[msg.sender].signer, "Invalid signature");

        // Set the secret contract's attributes in registry
        EnigmaCommon.SecretContract storage secretContract = state.contracts[_taskId];
        secretContract.owner = task.sender;
        secretContract.preCodeHash = _preCodeHash;
        secretContract.codeHash = _codeHash;
        secretContract.status = EnigmaCommon.SecretContractStatus.Deployed;
        secretContract.stateDeltaHashes.push(_initStateDeltaHash);
        state.scAddresses.push(_taskId);

        if (_optionalEthereumContractAddress != address(0)) {
            (bool success,) = _optionalEthereumContractAddress.call(_optionalEthereumData);
            require(success, "Ethereum call failed");
        }

        emit SecretContractDeployed(_taskId, _codeHash, _initStateDeltaHash);
    }

    function transferFundsAfterTask(EnigmaState.State storage state, address _worker, address _user, uint _gasUsed,
        uint _gasUnused, uint _gasPx)
    internal {
        // Credit worker with the fees associated with this task
        state.workers[_worker].balance = state.workers[_worker].balance.add(_gasUsed.mul(_gasPx));

        // Credit the task sender with the unused gas fees
        require(state.engToken.transfer(_user, (_gasUnused).mul(_gasPx)),
            "Token transfer failed");
    }

    function createTaskRecordImpl(
        EnigmaState.State storage state,
        bytes32 _inputsHash,
        uint _gasLimit,
        uint _gasPx,
        uint _firstBlockNumber
    )
    public
    {
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        require(_firstBlockNumber == WorkersImpl.getFirstBlockNumberImpl(state, block.number), "Wrong epoch for this task");

        // Transfer fee from sender to contract
        uint fee = _gasLimit.mul(_gasPx);
        // MOCK
        //require(state.engToken.allowance(msg.sender, address(this)) >= fee, "Allowance not enough");
        //require(state.engToken.transferFrom(msg.sender, address(this), fee), "Transfer not valid");

        // Create taskId and TaskRecord
        bytes32 taskId = keccak256(abi.encodePacked(msg.sender, state.userTaskDeployments[msg.sender]));
        EnigmaCommon.TaskRecord storage task = state.tasks[taskId];
        require(task.sender == address(0), "Task already exists");
        task.inputsHash = _inputsHash;
        task.gasLimit = _gasLimit;
        task.gasPx = _gasPx;
        task.sender = msg.sender;
        task.blockNumber = block.number;
        task.status = EnigmaCommon.TaskStatus.RecordCreated;

        // Increment user task deployment nonce
        state.userTaskDeployments[msg.sender]++;

        emit TaskRecordCreated(taskId, _inputsHash, _gasLimit, _gasPx, msg.sender, block.number);
    }

    function commitTaskFailureImpl(
        EnigmaState.State storage state,
        bytes32 _scAddr,
        bytes32 _taskId,
        uint64 _gasUsed,
        bytes memory _sig
    )
    public
    {
        EnigmaCommon.SecretContract memory secretContract = state.contracts[_scAddr];

        EnigmaCommon.TaskRecord storage task = state.tasks[_taskId];
        // MOCK
        //require(task.status == EnigmaCommon.TaskStatus.RecordCreated, 'Invalid task status');

        EnigmaCommon.Worker memory worker = state.workers[msg.sender];
        // MOCK
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        //require(worker.signer == WorkersImpl.getWorkerGroupImpl(state, task.blockNumber, _scAddr)[0],
        //    "Not the selected worker for this task");

        // Check that worker isn't charging the user too high of a fee
        //require(task.gasLimit >= _gasUsed, "Too much gas used for task");

        // Update proof and status attributes of TaskRecord
        task.proof = _sig;
        task.status = EnigmaCommon.TaskStatus.ReceiptFailed;

        // MOCK
        //transferFundsAfterTask(state, msg.sender, task.sender, _gasUsed, task.gasLimit.sub(_gasUsed), task.gasPx);

        // Verify the worker's signature
        bytes memory message;
        message = EnigmaCommon.appendMessage(message, task.inputsHash.toBytes());
        message = EnigmaCommon.appendMessage(message, secretContract.codeHash.toBytes());
        message = EnigmaCommon.appendMessage(message, _gasUsed.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, hex"00");
        bytes32 msgHash = keccak256(message);
        // MOCK
        //require(msgHash.recover(_sig) == state.workers[msg.sender].signer, "Invalid signature");

        emit ReceiptFailed(_taskId, _sig);
    }

    function verifyReceipt(EnigmaState.State storage state, bytes32 _scAddr, bytes32 _taskId, bytes32 _stateDeltaHash, uint _gasUsed, address _sender,
        bytes memory _sig)
    internal
    {
        EnigmaCommon.TaskRecord storage task = state.tasks[_taskId];
        // MOCK
        //require(task.status == EnigmaCommon.TaskStatus.RecordCreated, 'Invalid task status');

        EnigmaCommon.Worker memory worker = state.workers[_sender];
        // MOCK
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        //require(worker.signer == WorkersImpl.getWorkerGroupImpl(state, task.blockNumber, _scAddr)[0],
        //    "Not the selected worker for this task");

        // Check that worker isn't charging the user too high of a fee
        //require(task.gasLimit >= _gasUsed, "Too much gas used for task");

        // Update proof and status attributes of TaskRecord
        task.proof = _sig;
        task.status = EnigmaCommon.TaskStatus.ReceiptVerified;

        // MOCK
        //transferFundsAfterTask(state, _sender, task.sender, _gasUsed, task.gasLimit.sub(_gasUsed), task.gasPx);
    }

    function commitReceiptImpl(
        EnigmaState.State storage state,
        bytes32 _scAddr,
        bytes32 _taskId,
        bytes32 _stateDeltaHash,
        bytes32 _outputHash,
        bytes memory _optionalEthereumData,
        address _optionalEthereumContractAddress,
        uint64 _gasUsed,
        bytes memory _sig
    )
    public
    {
        EnigmaCommon.SecretContract storage secretContract = state.contracts[_scAddr];
        // Obtain the last state delta hash the contract is aware of
        bytes32 lastStateDeltaHash = secretContract.stateDeltaHashes[secretContract.stateDeltaHashes.length - 1];

        // Verify the receipt
        verifyReceipt(state, _scAddr, _taskId, _stateDeltaHash, _gasUsed, msg.sender, _sig);

        uint deltaHashIndex = _stateDeltaHash != bytes32(0) ? secretContract.stateDeltaHashes.push(_stateDeltaHash) - 1 :
            0;
        state.tasks[_taskId].outputHash = _outputHash;

        // Verify the worker's signature
        bytes memory message;
        message = EnigmaCommon.appendMessage(message, secretContract.codeHash.toBytes());
        message = EnigmaCommon.appendMessage(message, state.tasks[_taskId].inputsHash.toBytes());
        message = EnigmaCommon.appendMessage(message, lastStateDeltaHash.toBytes());
        message = EnigmaCommon.appendMessage(message, _stateDeltaHash.toBytes());
        message = EnigmaCommon.appendMessage(message, _outputHash.toBytes());
        message = EnigmaCommon.appendMessage(message, _gasUsed.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, _optionalEthereumData);
        message = EnigmaCommon.appendMessage(message, _optionalEthereumContractAddress.toBytes());
        message = EnigmaCommon.appendMessage(message, hex"01");
        bytes32 msgHash = keccak256(message);

        // MOCK
        //require(msgHash.recover(_sig) == state.workers[msg.sender].signer, "Invalid signature");

        if (_optionalEthereumContractAddress != address(0)) {
            (bool success,) = _optionalEthereumContractAddress.call(_optionalEthereumData);
            require(success, "Ethereum call failed");
        }

        emit ReceiptVerified(_taskId, _stateDeltaHash, _outputHash, deltaHashIndex, _optionalEthereumData,
            _optionalEthereumContractAddress, _sig);
    }

    function createTaskRecordsImpl(
        EnigmaState.State storage state,
        bytes32[] memory _inputsHashes,
        uint[] memory _gasLimits,
        uint[] memory _gasPxs,
        uint _firstBlockNumber
    )
    public
    {
        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        require(_firstBlockNumber == WorkersImpl.getFirstBlockNumberImpl(state, block.number), "Wrong epoch for this task");

        bytes32[] memory taskIds = new bytes32[](_inputsHashes.length);
        for (uint i = 0; i < _inputsHashes.length; i++) {
            // Transfer fee from sender to contract
            uint fee = _gasLimits[i].mul(_gasPxs[i]);
            require(state.engToken.allowance(msg.sender, address(this)) >= fee, "Allowance not enough");
            require(state.engToken.transferFrom(msg.sender, address(this), fee), "Transfer not valid");

            // Create taskId and TaskRecord
            bytes32 taskId = keccak256(abi.encodePacked(msg.sender, state.userTaskDeployments[msg.sender]));
            EnigmaCommon.TaskRecord storage task = state.tasks[taskId];
            require(task.sender == address(0), "Task already exists");
            taskIds[i] = taskId;
            task.inputsHash = _inputsHashes[i];
            task.gasLimit = _gasLimits[i];
            task.gasPx = _gasPxs[i];
            task.sender = msg.sender;
            task.blockNumber = block.number;
            task.status = EnigmaCommon.TaskStatus.RecordCreated;

            // Increment user task deployment nonce
            state.userTaskDeployments[msg.sender]++;
        }
        emit TaskRecordsCreated(taskIds, _inputsHashes, _gasLimits, _gasPxs, msg.sender, block.number);
    }

    function commitReceiptsImpl(
        EnigmaState.State storage state,
        bytes32 _scAddr,
        bytes32[] memory _taskIds,
        bytes32[] memory _stateDeltaHashes,
        bytes32[] memory _outputHashes,
        bytes memory _optionalEthereumData,
        address _optionalEthereumContractAddress,
        uint64[] memory _gasesUsed,
        bytes memory _sig
    )
    public
    {
        bytes32[] memory inputsHashes = new bytes32[](_taskIds.length);
        EnigmaCommon.SecretContract storage secretContract = state.contracts[_scAddr];
        // Obtain the last state delta hash the contract is aware of
        bytes32 lastStateDeltaHash = secretContract.stateDeltaHashes[secretContract.stateDeltaHashes.length - 1];

        for (uint i = 0; i < _taskIds.length; i++) {
            // Verify the receipt
            verifyReceipt(state, _scAddr, _taskIds[i], _stateDeltaHashes[i], _gasesUsed[i], msg.sender, _sig);
            inputsHashes[i] = state.tasks[_taskIds[i]].inputsHash;

            // Append the new state delta hash
            secretContract.stateDeltaHashes.push(_stateDeltaHashes[i]);
            state.tasks[_taskIds[i]].outputHash = _outputHashes[i];
        }

        // Verify the worker's signature
        bytes32 msgHash = keccak256(abi.encodePacked(secretContract.codeHash,
            inputsHashes,
            lastStateDeltaHash,
            _stateDeltaHashes,
            _outputHashes,
            _gasesUsed,
            uint64(_optionalEthereumData.length), _optionalEthereumData,
            uint64(20), _optionalEthereumContractAddress,
            bytes1(0x01)));

        // MOCK
        //require(msgHash.recover(_sig) == state.workers[msg.sender].signer, "Invalid signature");

        if (_optionalEthereumContractAddress != address(0)) {
            (bool success,) = _optionalEthereumContractAddress.call(_optionalEthereumData);
            require(success, "Ethereum call failed");
        }

        emit ReceiptsVerified(_taskIds, _stateDeltaHashes, _outputHashes, _optionalEthereumData,
            _optionalEthereumContractAddress, _sig);
    }

    function returnFeesForTaskImpl(
        EnigmaState.State storage state,
        bytes32 _taskId
    )
    public
    {
        EnigmaCommon.TaskRecord storage task = state.tasks[_taskId];

        // Ensure that the timeout window has elapsed, allowing for a fee return
        require(block.number - task.blockNumber > state.taskTimeoutSize, "Task timeout window has not elapsed yet");

        // Return the full fee to the task sender
        require(state.engToken.transfer(task.sender, task.gasLimit.mul(task.gasPx)), "Token transfer failed");

        // Set task's status to ReceiptFailed and emit event
        task.status = EnigmaCommon.TaskStatus.ReceiptFailed;
        emit TaskFeeReturned(_taskId);
    }
}
