pragma solidity ^0.5.12;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import { Bytes } from "../utils/Bytes.sol";

/**
 * @author Enigma
 *
 * This library contains the common structs and enums used throughout the Enigma codebase
 */
library EnigmaCommon {
    using SafeMath for uint256;
    using SafeMath for uint64;
    using Bytes for bytes;
    using Bytes for uint64;

    // ========================================== Structs ==========================================

    struct TaskRecord {
        address sender; // Sender of TaskRecord
        bytes32 inputsHash; // Inputs hash of encryptedFn, encryptedArgs, and contract address/preCodeHash
        bytes32 outputHash; // Output hash of task computation
        uint64 gasLimit; // ENG gas limit units
        uint64 gasPx; // ENG gas px in grains (10 ** 8) amount
        uint blockNumber; // Block number TaskRecord was mined
        TaskStatus status; // RecordUndefined: 0; RecordCreated: 1; ReceiptVerified: 2; ReceiptFailed: 3; ReceiptFailedETH: 4; ReceiptFailedReturn: 5
        bytes proof; // Signature of (taskId, inStateDeltaHash, outStateDeltaHash, ethCall)
    }

    struct Worker {
        address stakingAddress; // Staking address
        address signer; // Enclave address
        WorkerStatus status; // Unregistered: 0, LoggedIn: 1, LoggedOut: 2
        bytes report; // Decided to store this as one  RLP encoded attribute for easier external storage in the future
        uint256 balance; // ENG balance of worker
        WorkerLog[] workerLogs; // Logs containing info regarding updates in worker status
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

    enum TaskStatus {RecordUndefined, RecordCreated, ReceiptVerified, ReceiptFailed, ReceiptFailedETH,
        ReceiptFailedReturn}

    enum WorkerStatus {Unregistered, LoggedIn, LoggedOut}

    enum SecretContractStatus {Undefined, Deployed}

    enum WorkerLogType {Undefined, LogIn, LogOut, Compound}

    // ========================================== Shared Functions ==========================================

    /**
    * Append the length of a variable and the variable to an existing bytes buffer
    *
    * @param _message Bytes buffer being appended to
    * @param _var Bytes representation of value that needs to be concatenated to existing buffer
    * @return New bytes buffer
    */
    function appendMessage(bytes memory _message, bytes memory _var)
    internal
    pure
    returns (bytes memory)
    {
        return (_message.concat(uint64(_var.length).toBytesFromUint64())).concat(_var);
    }

    /**
    * Append the length of a variable and the variable to an existing bytes buffer
    *
    * @param _message Bytes buffer being appended to
    * @param _var Bytes representation of value that needs to be concatenated to existing buffer
    * @return New bytes buffer
    */
    function appendMessageKM(bytes memory _message, bytes memory _var)
    internal
    pure
    returns (bytes memory)
    {
        return ((_message.concat(hex"00")).concat(uint64(_var.length).toBytesFromUint64())).concat(_var);
    }

    /**
    * Append the length of an array to an existing bytes buffer
    *
    * @param _message Bytes buffer being appended to
    * @param _arraylength Length of array
    * @param _typeLength Length of each item in bytes
    * @return New bytes buffer
    */
    function appendMessageArrayLength(uint256 _arraylength, uint256 _typeLength, bytes memory _message)
    internal
    pure
    returns (bytes memory)
    {
        return (_message.concat(hex"01")).concat(uint64(_arraylength.mul(_typeLength.add(9))).toBytesFromUint64());
    }
}
