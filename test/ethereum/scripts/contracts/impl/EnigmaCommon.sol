pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import { Bytes } from "../utils/Bytes.sol";

/**
 * @author Enigma
 *
 * This library contains the common structs and enums used throughout the Enigma codebase
 */
library EnigmaCommon {
    using Bytes for bytes;
    using Bytes for uint64;

    // ========================================== Structs ==========================================

    struct TaskRecord {
        address sender; // Sender of TaskRecord
        bytes32 inputsHash; // Inputs hash of encryptedFn, encryptedArgs, and contract address/preCodeHash)
        bytes32 outputHash; // Output hash
        uint gasLimit; // ENG gas limit units
        uint gasPx; // ENG gas px in grains (10 ** 8) amount
        uint blockNumber; // Block number TaskRecord was mined
        TaskStatus status; // RecordUndefined: 0; RecordCreated: 1; ReceiptVerified: 2; ReceiptFailed: 3
        bytes proof; // Signature of (taskId, inStateDeltaHash, outStateDeltaHash, ethCall)
    }

    struct Worker {
        address signer; // Enclave address
        WorkerStatus status; // Unregistered: 0, LoggedIn: 1, LoggedOut: 2
        bytes report; // Decided to store this as one  RLP encoded attribute for easier external storage in the future
        uint256 balance; // ENG balance
        WorkerLog[] workerLogs;
    }

    /**
    * The data representation of the worker parameters used as input for
    * the worker selection algorithm
    */
    struct WorkersParams {
        uint firstBlockNumber;
        address[] workers;
        uint[] stakes;
        uint seed;
    }

    struct WorkerLog {
        WorkerLogType workerEventType;
        uint blockNumber;
        uint balance;
    }

    struct SecretContract {
        address owner; // Owner who deployed secret contract
        bytes32 preCodeHash; // Predeployed bytecode hash
        bytes32 codeHash; // Deployed bytecode hash
        bytes32[] stateDeltaHashes; // Array of state delta hashes
        SecretContractStatus status; // Undefined: 0, Deployed: 1
        // TODO: consider keeping an index of taskIds
    }

    // ========================================== Enums ==========================================

    enum TaskStatus {RecordUndefined, RecordCreated, ReceiptVerified, ReceiptFailed}

    enum WorkerStatus {Unregistered, LoggedIn, LoggedOut}

    enum SecretContractStatus {Undefined, Deployed}

    enum WorkerLogType {Undefined, LogIn, LogOut, Compound}

    // ========================================== Shared Functions ==========================================

    function appendMessage(bytes memory _message, bytes memory _var)
    internal
    returns (bytes memory)
    {
        return (_message.concat(uint64(_var.length).toBytesFromUint64())).concat(_var);
    }

    function appendMessageArrayLength(uint256 arrayLength, bytes memory _message)
    internal
    returns (bytes memory)
    {
        return _message.concat(uint64(arrayLength).toBytesFromUint64());
    }
}
