pragma solidity ^0.5.12;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

import { EnigmaCommon } from "./EnigmaCommon.sol";
import { EnigmaState } from "./EnigmaState.sol";
import { WorkersImpl } from "./WorkersImpl.sol";
import { IExchangeRate } from "../interfaces/IExchangeRate.sol";
import { Bytes } from "../utils/Bytes.sol";
import "../utils/SolRsaVerify.sol";

/**
 * @author Enigma
 *
 * Library that maintains functionality associated with tasks
 */
library TaskImpl {
    using SafeMath for uint256;
    using SafeMath for uint64;
    using ECDSA for bytes32;
    using Bytes for bytes;
    using Bytes for bytes32;
    using Bytes for uint64;
    using Bytes for address;

    event TaskRecordCreated(bytes32 indexed taskId, bytes32 inputsHash, uint64 gasLimit, uint64 gasPx, address sender,
        uint blockNumber);
    // SecretContractDeployed => bytes32s [taskId, preCodeHash, codeHash, initStateDeltaHash]
    event SecretContractDeployed(bytes32 indexed taskId, uint64 gasUsed, address optionalEthereumContractAddress,
        bytes32[4] bytes32s, uint gasUsedTotal, bytes optionalEthereumData, address workerAddress);
    // ReceiptVerified => bytes32s [scAddr, taskId, stateDeltaHash, outputHash]
    event ReceiptVerified(uint64 gasUsed, address optionalEthereumContractAddress, bytes32[4] bytes32s,
        uint deltaHashIndex, uint gasUsedTotal, bytes optionalEthereumData, address workerAddress, bytes sig);
    event ReceiptFailed(bytes32 indexed taskId, bytes32 scAddr, uint gasUsed, address workerAddress, bytes sig);
    event ReceiptFailedETH(bytes32 indexed taskId, bytes32 scAddr, uint gasUsed, uint gasUsedTotal, address workerAddress,
        bytes sig);
    event TaskFeeReturned(bytes32 indexed taskId);

    function createDeploymentTaskRecordImpl(
        EnigmaState.State storage state,
        bytes32 _inputsHash,
        uint64 _gasLimit,
        uint64 _gasPx,
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
        state.taskIds.push(taskId);
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

    function deploySecretContractFailureImpl(EnigmaState.State storage state, bytes32 _taskId, bytes32 _codeHash,
        uint64 _gasUsed, bytes memory _sig)
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
        task.outputHash = _codeHash;

        //MOCK
        //transferFundsAfterTask(state, msg.sender, task.sender, _gasUsed, task.gasLimit.sub(_gasUsed), task.gasPx);

        // Verify the worker's signature
        bytes memory message;
        message = EnigmaCommon.appendMessage(message, task.inputsHash.toBytes());
        message = EnigmaCommon.appendMessage(message, task.gasLimit.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, _gasUsed.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, hex"00");
        bytes32 msgHash = keccak256(message);
        // MOCK
        //require(msgHash.recover(_sig) == state.workers[msg.sender].signer, "Invalid signature");

        emit ReceiptFailed(_taskId, _taskId, _gasUsed, msg.sender, _sig);
    }

    function verifyDeployReceipt(EnigmaState.State storage state, bytes32 _taskId, bytes32 _codeHash,
        bytes32 _initStateDeltaHash, bytes memory _optionalEthereumData, address _optionalEthereumContractAddress,
        uint64 _gasUsed, bytes memory _sig)
    internal
    view
    {
        validateReceipt(state, _gasUsed, _taskId, _taskId);

        // Verify the worker's signature
        bytes memory message;
        EnigmaCommon.TaskRecord storage task = state.tasks[_taskId];
        message = EnigmaCommon.appendMessage(message, task.inputsHash.toBytes());
        message = EnigmaCommon.appendMessage(message, _codeHash.toBytes());
        message = EnigmaCommon.appendMessage(message, _initStateDeltaHash.toBytes());
        message = EnigmaCommon.appendMessage(message, task.gasLimit.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, _gasUsed.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, _optionalEthereumData);
        message = EnigmaCommon.appendMessage(message, _optionalEthereumContractAddress.toBytes());
        message = EnigmaCommon.appendMessage(message, hex"01");
        bytes32 msgHash = keccak256(message);
        require(msgHash.recover(_sig) == state.workers[msg.sender].signer,
            "Invalid signature");
    }

    function deploySecretContractImpl(
        EnigmaState.State storage state,
        uint64 _gasUsed,
        address _optionalEthereumContractAddress,
        bytes32[4] memory _bytes32s,
        bytes memory _optionalEthereumData,
        bytes memory _sig)
    public
    {
        EnigmaCommon.SecretContract storage secretContract = state.contracts[_bytes32s[0]];
        EnigmaCommon.TaskRecord storage task = state.tasks[_bytes32s[0]];
        // MOCK
        //verifyDeployReceipt(state, _bytes32s[0], _bytes32s[2], _bytes32s[3], _optionalEthereumData,
        //    _optionalEthereumContractAddress, _gasUsed, msg.sender, _sig);
        task.proof = _sig;
        uint256 callbackGasETH;
        uint256 callbackGasENG;

        if (_optionalEthereumContractAddress != address(0)) {
            callbackGasETH = (task.gasLimit.sub(_gasUsed)).mul(task.gasPx); // Unused gas fee (ENG grains)
            callbackGasETH = callbackGasETH.mul(IExchangeRate(state.exchangeRate).getExchangeRate()).mul(10**10).div(10**8); // Unused gas fee (ETH wei)
            callbackGasETH = callbackGasETH.div(tx.gasprice); // Unused gas units (ETH)
            uint256 gasLeftInit = gasleft();
            (bool success,) = _optionalEthereumContractAddress.call.gas(callbackGasETH)(_optionalEthereumData);
            callbackGasENG = gasLeftInit.sub(gasleft()); // Callback used gas units (ETH)
            callbackGasENG = callbackGasENG.mul(tx.gasprice); // Callback used gas fee (ETH)
            callbackGasENG = callbackGasENG.mul(10**8).div(IExchangeRate(state.exchangeRate).getExchangeRate()).div(10**10); // Callback used gas fee (ENG)
            callbackGasENG = (callbackGasENG.div(task.gasPx)).add(_gasUsed); // Total used gas units (ENG)
            transferFundsAfterTask(state, msg.sender, task.sender, callbackGasENG,
                task.gasLimit.sub(callbackGasENG), task.gasPx);
            if (success) {
                task.status = EnigmaCommon.TaskStatus.ReceiptVerified;
                secretContract.owner = task.sender;
                secretContract.preCodeHash = _bytes32s[1];
                secretContract.codeHash = _bytes32s[2];
                secretContract.status = EnigmaCommon.SecretContractStatus.Deployed;
                secretContract.stateDeltaHashes.push(_bytes32s[3]);
                state.scAddresses.push(_bytes32s[0]);
                emit SecretContractDeployed(_bytes32s[0], _gasUsed, _optionalEthereumContractAddress, _bytes32s,
                    callbackGasENG, _optionalEthereumData, msg.sender);
            } else {
                task.status = EnigmaCommon.TaskStatus.ReceiptFailedETH;
                emit ReceiptFailedETH(_bytes32s[0], _bytes32s[0], _gasUsed, callbackGasENG, msg.sender, _sig);
            }
        } else {
            // MOCK
            //transferFundsAfterTask(state, msg.sender, task.sender, _gasUsed, task.gasLimit.sub(_gasUsed), task.gasPx);
            task.status = EnigmaCommon.TaskStatus.ReceiptVerified;
            secretContract.owner = task.sender;
            secretContract.preCodeHash = _bytes32s[1];
            secretContract.codeHash = _bytes32s[2];
            secretContract.status = EnigmaCommon.SecretContractStatus.Deployed;
            secretContract.stateDeltaHashes.push(_bytes32s[3]);
            state.scAddresses.push(_bytes32s[0]);
            emit SecretContractDeployed(_bytes32s[0], _gasUsed, _optionalEthereumContractAddress, _bytes32s, _gasUsed,
                _optionalEthereumData, msg.sender);
        }
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
        uint64 _gasLimit,
        uint64 _gasPx,
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
        state.taskIds.push(taskId);
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
        bytes32 _outputHash,
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
        task.outputHash = _outputHash;

        // MOCK
        //transferFundsAfterTask(state, msg.sender, task.sender, _gasUsed, task.gasLimit.sub(_gasUsed), task.gasPx);

        // Verify the worker's signature
        bytes memory message;
        message = EnigmaCommon.appendMessage(message, task.inputsHash.toBytes());
        message = EnigmaCommon.appendMessage(message, secretContract.codeHash.toBytes());
        message = EnigmaCommon.appendMessage(message, task.gasLimit.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, _gasUsed.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, hex"00");
        bytes32 msgHash = keccak256(message);
        // MOCK
        //require(msgHash.recover(_sig) == state.workers[msg.sender].signer, "Invalid signature");

        emit ReceiptFailed(_taskId, _scAddr, _gasUsed, msg.sender, _sig);
    }

    function validateReceipt(EnigmaState.State storage state, uint64 _gasUsed, bytes32 _scAddr, bytes32 _taskId)
    internal
    view
    {
        EnigmaCommon.Worker memory worker = state.workers[msg.sender];
        EnigmaCommon.TaskRecord memory task = state.tasks[_taskId];
        // MOCK
        //require(task.status == EnigmaCommon.TaskStatus.RecordCreated, 'Invalid task status');

        // Worker deploying task must be the appropriate worker as per the worker selection algorithm
        //require(worker.signer == WorkersImpl.getWorkerGroupImpl(state, task.blockNumber, _scAddr)[0],
        //    "Not the selected worker for this task");

        // Check that worker isn't charging the user too high of a fee
        //require(task.gasLimit >= _gasUsed, "Too much gas used for task");
    }

    function verifyReceipt(EnigmaState.State storage state, bytes32 _scAddr, bytes32 _taskId, bytes32 _stateDeltaHash,
        bytes32 _outputHash, bytes memory _optionalEthereumData, address _optionalEthereumContractAddress,
        uint64 _gasUsed, bytes memory _sig)
    internal
    view
    {
        EnigmaCommon.SecretContract memory secretContract = state.contracts[_scAddr];
        validateReceipt(state, _gasUsed, _scAddr, _taskId);

        bytes32 lastStateDeltaHash = secretContract.stateDeltaHashes[secretContract.stateDeltaHashes.length - 1];

        // Verify the worker's signature
        bytes memory message;
        EnigmaCommon.TaskRecord storage task = state.tasks[_taskId];
        message = EnigmaCommon.appendMessage(message, secretContract.codeHash.toBytes());
        message = EnigmaCommon.appendMessage(message, task.inputsHash.toBytes());
        message = EnigmaCommon.appendMessage(message, lastStateDeltaHash.toBytes());
        message = EnigmaCommon.appendMessage(message, _stateDeltaHash.toBytes());
        message = EnigmaCommon.appendMessage(message, _outputHash.toBytes());
        message = EnigmaCommon.appendMessage(message, task.gasLimit.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, _gasUsed.toBytesFromUint64());
        message = EnigmaCommon.appendMessage(message, _optionalEthereumData);
        message = EnigmaCommon.appendMessage(message, _optionalEthereumContractAddress.toBytes());
        message = EnigmaCommon.appendMessage(message, hex"01");
        bytes32 msgHash = keccak256(message);

        // MOCK
        //require(msgHash.recover(_sig) == state.workers[_sender].signer, "Invalid signature");
    }

    function commitReceiptImpl(
        EnigmaState.State storage state,
        uint64 _gasUsed,
        address _optionalEthereumContractAddress,
        bytes32[4] memory _bytes32s,
        bytes memory _optionalEthereumData,
        bytes memory _sig
    )
    public
    {
        EnigmaCommon.SecretContract storage secretContract = state.contracts[_bytes32s[0]];
        EnigmaCommon.TaskRecord storage task = state.tasks[_bytes32s[1]];

        // Verify the receipt
        verifyReceipt(state, _bytes32s[0], _bytes32s[1], _bytes32s[2], _bytes32s[3], _optionalEthereumData,
            _optionalEthereumContractAddress, _gasUsed, _sig);

        task.proof = _sig;
        uint256 callbackGasETH;
        uint256 callbackGasENG;
        if (_optionalEthereumContractAddress != address(0)) {
            callbackGasETH = (task.gasLimit.sub(_gasUsed)).mul(task.gasPx); // Unused gas fee (ENG grains)
            callbackGasETH = callbackGasETH.mul(IExchangeRate(state.exchangeRate).getExchangeRate()).mul(10**10).div(10**8); // Unused gas fee (ETH wei)
            callbackGasETH = callbackGasETH.div(tx.gasprice); // Unused gas units (ETH)
            uint256 gasLeftInit = gasleft();
            (bool success,) = _optionalEthereumContractAddress.call.gas(callbackGasETH)(_optionalEthereumData);
            callbackGasENG = gasLeftInit.sub(gasleft()); // Callback used gas units (ETH)
            callbackGasENG = callbackGasENG.mul(tx.gasprice); // Callback used gas fee (ETH)
            callbackGasENG = callbackGasENG.mul(10**8).div(IExchangeRate(state.exchangeRate).getExchangeRate()).div(10**10); // Callback used gas fee (ENG)
            callbackGasENG = (callbackGasENG.div(task.gasPx)).add(_gasUsed); // Total used gas units (ENG)
            transferFundsAfterTask(state, msg.sender, task.sender, callbackGasENG,
                task.gasLimit.sub(callbackGasENG), task.gasPx);
            if (success) {
                task.status = EnigmaCommon.TaskStatus.ReceiptVerified;
                uint deltaHashIndex = _bytes32s[2] != bytes32(0) ?
                    secretContract.stateDeltaHashes.push(_bytes32s[2]) - 1 : 0;
                state.tasks[_bytes32s[1]].outputHash = _bytes32s[3];
                emit ReceiptVerified(_gasUsed, _optionalEthereumContractAddress, _bytes32s, deltaHashIndex, callbackGasENG,
                    _optionalEthereumData, msg.sender, _sig);
            } else {
                task.status = EnigmaCommon.TaskStatus.ReceiptFailedETH;
                emit ReceiptFailedETH(_bytes32s[1], _bytes32s[0], _gasUsed, callbackGasENG, msg.sender, _sig);
            }
        } else {
            //MOCK
            //transferFundsAfterTask(state, msg.sender, task.sender, _gasUsed, task.gasLimit.sub(_gasUsed), task.gasPx);
            task.status = EnigmaCommon.TaskStatus.ReceiptVerified;
            uint deltaHashIndex = _bytes32s[2] != bytes32(0) ?
                secretContract.stateDeltaHashes.push(_bytes32s[2]) - 1 : 0;
            state.tasks[_bytes32s[1]].outputHash = _bytes32s[3];
            emit ReceiptVerified(_gasUsed, _optionalEthereumContractAddress, _bytes32s, deltaHashIndex, _gasUsed,
                _optionalEthereumData, msg.sender, _sig);
        }
    }

    function verifyReceipts(EnigmaState.State storage state, bytes32 _scAddr, bytes32[] memory _taskIds,
        bytes32[] memory _stateDeltaHashes, bytes32[] memory _outputHashes, bytes memory _optionalEthereumData,
        address _optionalEthereumContractAddress, uint64[] memory _gasesUsed, address _sender, bytes memory _sig)
    internal
    view
    {
        EnigmaCommon.SecretContract memory secretContract = state.contracts[_scAddr];
        bytes32[] memory inputsHashes = new bytes32[](_taskIds.length);
        for (uint i = 0; i < _taskIds.length; i++) {
            validateReceipt(state, _gasesUsed[i], _scAddr, _taskIds[i]);

            inputsHashes[i] = state.tasks[_taskIds[i]].inputsHash;
        }

        bytes32 lastStateDeltaHash = secretContract.stateDeltaHashes[secretContract.stateDeltaHashes.length - 1];

        // Verify the principal's signature
        bytes memory message;
        message = EnigmaCommon.appendMessage(message, secretContract.codeHash.toBytes());
        message = EnigmaCommon.appendMessageArrayLength(inputsHashes.length, 32, message);
        for (uint i = 0; i < inputsHashes.length; i++) {
            message = EnigmaCommon.appendMessage(message, inputsHashes[i].toBytes());
        }
        message = EnigmaCommon.appendMessage(message, lastStateDeltaHash.toBytes());
        message = EnigmaCommon.appendMessageArrayLength(_stateDeltaHashes.length, 32, message);
        for (uint j = 0; j < _stateDeltaHashes.length; j++) {
            message = EnigmaCommon.appendMessage(message, _stateDeltaHashes[j].toBytes());
        }
        message = EnigmaCommon.appendMessageArrayLength(_outputHashes.length, 32, message);
        for (uint k = 0; k < _outputHashes.length; k++) {
            message = EnigmaCommon.appendMessage(message, _outputHashes[k].toBytes());
        }
        message = EnigmaCommon.appendMessageArrayLength(_gasesUsed.length, 8, message);
        for (uint m = 0; m < _gasesUsed.length; m++) {
            message = EnigmaCommon.appendMessage(message, _gasesUsed[m].toBytesFromUint64());
        }
        message = EnigmaCommon.appendMessage(message, _optionalEthereumData);
        message = EnigmaCommon.appendMessage(message, _optionalEthereumContractAddress.toBytes());
        message = EnigmaCommon.appendMessage(message, hex"01");
        bytes32 msgHash = keccak256(message);
        require(msgHash.recover(_sig) == state.workers[msg.sender].signer,
            "Invalid signature");
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
        task.status = EnigmaCommon.TaskStatus.ReceiptFailedReturn;
        emit TaskFeeReturned(_taskId);
    }
}
