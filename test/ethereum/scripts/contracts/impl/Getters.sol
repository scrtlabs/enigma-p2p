pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {EnigmaCommon} from "./EnigmaCommon.sol";
import {EnigmaStorage} from "./EnigmaStorage.sol";

/**
 * @author Enigma
 *
 * Getter functions to be used by Enigma library to access state variables
 */
contract Getters is EnigmaStorage {
    /**
    * Get signing address of calling worker
    *
    * @return Signing address
    */
    function getSigningAddress() public view returns (address) {
        return state.workers[msg.sender].signer;
    }

    /**
    * Get Worker struct from a given worker's ethereum address
    *
    * @param _worker Worker's ethereum address
    * @return Worker struct
    */
    function getWorker(address _worker) public view returns (EnigmaCommon.Worker memory) {
        return state.workers[_worker];
    }

    /**
    * Get Worker struct from a given worker's signing address
    *
    * @param _signer Worker's signing address
    * @return Ethereum address
    * @return Worker struct
    */
    function getWorkerFromSigningAddress(address _signer) public view returns (address, EnigmaCommon.Worker memory) {
        address account;
        EnigmaCommon.Worker memory worker;
        for (uint i = 0; i < state.workerAddresses.length; i++) {
            worker = state.workers[state.workerAddresses[i]];
            if (worker.signer == _signer) {
                account = state.workerAddresses[i];
                break;
            }
        }
        return (account, worker);
    }

    /**
    * Get the current number/index (used as unique nonce value) of task deployments for a given user user
    *
    * @param _sender Task sender's ethereum address
    * @return Current number for task deployments for user
    */
    function getUserTaskDeployments(address _sender) public view returns (uint) {
        return state.userTaskDeployments[_sender];
    }

    /**
    * Get the epoch block size
    *
    * @return Epoch size
    */
    function getEpochSize() public view returns (uint) {
        return state.epochSize;
    }

    /**
    * Get the task timeout size
    *
    * @return task timeout
    */
    function getTaskTimeoutSize() public view returns (uint) {
        return state.taskTimeoutSize;
    }

    /**
    * Get a TaskRecord struct given a particular task's ID
    *
    * @param _taskId Unique identifier for a given task
    * @return TaskRecord struct
    */
    function getTaskRecord(bytes32 _taskId) public view returns (EnigmaCommon.TaskRecord memory) {
        return state.tasks[_taskId];
    }

    /**
    * Get a SecretContract struct given a particular secret contract address
    *
    * @param _scAddr Secret contract address
    * @return SecretContract struct
    */
    function getSecretContract(bytes32 _scAddr) public view returns (EnigmaCommon.SecretContract memory) {
        return state.contracts[_scAddr];
    }

    /**
    * Get epoch-based history of worker params information
    *
    * @return Array of WorkersParams structs
    */
    function getWorkersParams() public view returns (EnigmaCommon.WorkersParams[5] memory) {
        return state.workersParams;
    }

    /**
    * Get all secret contract addresses
    *
    * @return Array of secret contract addresses
    */
    function getAllSecretContractAddresses() public view returns (bytes32[] memory) {
        return state.scAddresses;
    }
}
