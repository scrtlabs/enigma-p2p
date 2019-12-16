pragma solidity ^0.5.12;
pragma experimental ABIEncoderV2;

contract ExchangeRate {

    constructor() public {

    }

    function getExchangeRate() public view returns (uint256) {
        return 164518;// 0.00164518
    }
}
