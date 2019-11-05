pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

interface IExchangeRate {
    function getExchangeRate() external view returns (uint256);
}
