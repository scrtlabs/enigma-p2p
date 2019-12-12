pragma solidity ^0.5.12;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

import { EnigmaCommon } from "./EnigmaCommon.sol";
import { EnigmaState } from "./EnigmaState.sol";
import "../utils/SolRsaVerify.sol";

/**
 * @author Enigma
 *
 * Library that maintains functionality associated with secret contracts
 */
library SecretContractImpl {
    using SafeMath for uint256;
    using ECDSA for bytes32;

    function countStateDeltasImpl(EnigmaState.State storage state, bytes32 _scAddr)
    public
    view
    returns (uint)
    {
        return state.contracts[_scAddr].stateDeltaHashes.length;
    }

    function countSecretContractsImpl(EnigmaState.State storage state)
    public
    view
    returns (uint)
    {
        return state.scAddresses.length;
    }

    function getSecretContractAddressesImpl(EnigmaState.State storage state, uint _start, uint _stop)
    public
    view
    returns (bytes32[] memory)
    {
        if (_stop == 0) {
            _stop = state.scAddresses.length;
        }
        bytes32[] memory addresses = new bytes32[](_stop.sub(_start));
        uint pos = 0;
        for (uint i = _start; i < _stop; i++) {
            addresses[pos] = state.scAddresses[i];
            pos++;
        }
        return addresses;
    }

}
