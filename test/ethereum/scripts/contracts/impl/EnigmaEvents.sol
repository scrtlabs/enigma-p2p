pragma solidity ^0.5.12;
pragma experimental ABIEncoderV2;

/**
 * @author Enigma
 *
 * Registers events to be emitted by the various functionalities of the Enigma codebase (need to be detailed here
 * as well as in the individual library as well
 */
contract EnigmaEvents {
    event Registered(address custodian, address signer);
    event WorkersParameterized(uint seed, uint256 firstBlockNumber, uint256 inclusionBlockNumber, address[] workers,
        uint[] stakes, uint nonce);
    event TaskRecordCreated(bytes32 indexed taskId, bytes32 inputsHash, uint64 gasLimit, uint64 gasPx, address sender,
        uint blockNumber);
    // ReceiptVerified => bytes32s [scAddr, taskId, stateDeltaHash, outputHash]
    event ReceiptVerified(bytes32 indexed taskId, uint64 gasUsed, address optionalEthereumContractAddress,
        bytes32[4] bytes32s, uint deltaHashIndex, uint gasUsedTotal, bytes optionalEthereumData, bytes sig,
        address workerAddress);
    event ReceiptFailed(bytes32 indexed taskId, bytes32 scAddr, uint gasUsed, address workerAddress, bytes sig);
    event ReceiptFailedETH(bytes32 indexed taskId, bytes32 scAddr, uint gasUsed, uint gasUsedTotal,
        address workerAddress, bytes sig);
    event TaskFeeReturned(bytes32 indexed taskId);
    event DepositSuccessful(address from, uint value);
    event WithdrawSuccessful(address to, uint value);
    // SecretContractDeployed => bytes32s [taskId, preCodeHash, codeHash, initStateDeltaHash]
    event SecretContractDeployed(bytes32 indexed taskId, uint64 gasUsed, address optionalEthereumContractAddress,
        bytes32[4] bytes32s, uint gasUsedTotal, bytes optionalEthereumData, address workerAddress);
    event LoggedIn(address workerAddress);
    event LoggedOut(address workerAddress);
}