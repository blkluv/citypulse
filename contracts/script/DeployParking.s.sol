// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CityPulseParking.sol";

contract DeployParking is Script {
    function run() external {
        vm.startBroadcast();

        uint256 parkingPrice = 100; // 0.0001 USDC
        CityPulseParking parking = new CityPulseParking(parkingPrice);

        console.log("CityPulseParking deployed at:", address(parking));
        console.log("Parking price:", parking.parkingQueryPrice());
        console.log("Municipality:", parking.municipality());

        vm.stopBroadcast();
    }
}
