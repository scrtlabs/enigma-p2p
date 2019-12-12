pragma solidity ^0.5.12;
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
