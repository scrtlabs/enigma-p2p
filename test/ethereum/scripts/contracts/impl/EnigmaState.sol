pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import { EnigmaCommon } from "./EnigmaCommon.sol";
import { ERC20 } from "../interfaces/ERC20.sol";

/**
 * @author Enigma
 *
 * Maintains the state of the Enigma contract (and the associated libraries)
 */
library EnigmaState {
    struct State {
        // The interface of the deployed ENG ERC20 token contract
        ERC20 engToken;

        // Epoch size in number of blocks
        uint epochSize;

        // Task timeout size in number of blocks
        uint taskTimeoutSize;

        /**
        * The signer address of the principal node
        * This must be set when deploying the contract and remains immutable
        * Since the signer address is derived from the public key of an
        * SGX enclave, this ensures that the principal node cannot be tempered
        * with or replaced.
        */
        address principal;

        address exchangeRate;

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
        EnigmaCommon.WorkersParams[5] workersParams;

        // An address-based index of all registered worker
        address[] workerAddresses;
        // An address-based index of all secret contracts
        bytes32[] scAddresses;

        // A registry of all registered workers with their attributes
        mapping(address => EnigmaCommon.Worker) workers;

        // A registry of all tasks with their attributes
        mapping(bytes32 => EnigmaCommon.TaskRecord) tasks;

        // A registry of all deployed secret contracts with their attributes
        mapping(bytes32 => EnigmaCommon.SecretContract) contracts;

        // A mapping of number of tasks deployed for each address
        mapping(address => uint) userTaskDeployments;

        // TODO: do we keep tasks forever? if not, when do we delete them?
        uint stakingThreshold;
        uint workerGroupSize;
    }
}
