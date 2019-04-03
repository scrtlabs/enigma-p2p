pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import { EnigmaState } from "./EnigmaState.sol";

/**
 * @author Enigma
 *
 * Storage for the Enigma state
 */
contract EnigmaStorage {
    EnigmaState.State state;
}
