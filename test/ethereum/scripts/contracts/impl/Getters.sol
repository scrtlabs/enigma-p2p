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
    function getSigningAddress() public view returns (address) {
        return state.workers[msg.sender].signer;
    }

    function getWorker(address _worker) public view returns (EnigmaCommon.Worker memory) {
        return state.workers[_worker];
    }

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

    function getUserTaskDeployments(address _sender) public view returns (uint) {
        return state.userTaskDeployments[_sender];
    }

    function getEpochSize() public view returns (uint) {
        return state.epochSize;
    }

    function getTaskRecord(bytes32 _taskId) public view returns (EnigmaCommon.TaskRecord memory) {
        return state.tasks[_taskId];
    }

    function getSecretContract(bytes32 _scAddr) public view returns (EnigmaCommon.SecretContract memory) {
        return state.contracts[_scAddr];
    }

    function getWorkersParams() public view returns (EnigmaCommon.WorkersParams[5] memory) {
        return state.workersParams;
    }
}
