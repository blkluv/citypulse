// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CityPulseParking {
    address public municipality;
    uint256 public parkingQueryPrice;
    uint256 public totalParkingQueries;
    uint256 public totalRevenue;

    event ParkingQueryPaid(
        address indexed driver,
        uint256 amount,
        uint256 timestamp,
        string zone
    );

    event ParkingPriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(uint256 _parkingQueryPrice) {
        municipality = msg.sender;
        parkingQueryPrice = _parkingQueryPrice;
    }

    function payForParking(string calldata zone) external payable {
        require(msg.value >= parkingQueryPrice, "Insufficient payment");

        totalParkingQueries++;
        totalRevenue += msg.value;

        emit ParkingQueryPaid(msg.sender, msg.value, block.timestamp, zone);

        if (msg.value > parkingQueryPrice) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - parkingQueryPrice}("");
            require(refundSuccess, "Refund failed");
        }
    }

    function withdraw() external {
        require(msg.sender == municipality, "Only municipality");
        uint256 bal = address(this).balance;
        (bool success, ) = payable(municipality).call{value: bal}("");
        require(success, "Withdraw failed");
    }

    function setParkingQueryPrice(uint256 _newPrice) external {
        require(msg.sender == municipality, "Only municipality");
        uint256 oldPrice = parkingQueryPrice;
        parkingQueryPrice = _newPrice;
        emit ParkingPriceUpdated(oldPrice, _newPrice);
    }

    function getStats() external view returns (
        uint256 _totalParkingQueries,
        uint256 _totalRevenue,
        uint256 _parkingQueryPrice,
        uint256 _balance
    ) {
        return (totalParkingQueries, totalRevenue, parkingQueryPrice, address(this).balance);
    }
}
