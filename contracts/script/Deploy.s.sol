// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CityPulseX402.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        uint256 queryPrice = 1000; // 0.001 USDC (6 decimals) // 0.0001 USDC (18 decimal precision)
        CityPulseX402 cityPulse = new CityPulseX402(queryPrice);

        console.log("CityPulseX402 deployed at:", address(cityPulse));
        console.log("Query price:", cityPulse.queryPrice());
        console.log("Municipality:", cityPulse.municipality());

        vm.stopBroadcast();
    }
}
