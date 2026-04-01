// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CityPulseX402 {
    address public municipality;
    uint256 public queryPrice;
    uint256 public parkingQueryPrice;

    uint256 public totalQueries;
    uint256 public totalRevenue;
    uint256 public totalParkingQueries;

    mapping(bytes32 => uint256) public zonePriceMultiplier;

    event QueryPaid(
        address indexed driver,
        uint256 amount,
        uint256 timestamp,
        string fromZone,
        string toZone,
        uint256 vehiclesQueried
    );

    event ParkingQueryPaid(
        address indexed driver,
        uint256 amount,
        uint256 timestamp,
        string zone
    );

    event RouteOptimized(
        address indexed driver,
        uint256 estimatedSavingSeconds,
        uint256 vehiclesUsed
    );

    constructor(uint256 _queryPrice) {
        municipality = msg.sender;
        queryPrice = _queryPrice;
        parkingQueryPrice = _queryPrice / 10; // default: 1/10 of route price
    }

    function payForRoute(
        string calldata fromZone,
        string calldata toZone,
        uint256 vehiclesQueried
    ) external payable {
        uint256 cost = queryPrice * vehiclesQueried;
        require(msg.value >= cost, "Insufficient payment");

        totalQueries++;
        totalRevenue += msg.value;

        emit QueryPaid(msg.sender, msg.value, block.timestamp, fromZone, toZone, vehiclesQueried);

        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    function payForParking(string calldata zone) external payable {
        require(msg.value >= parkingQueryPrice, "Insufficient payment");

        totalParkingQueries++;
        totalRevenue += msg.value;

        emit ParkingQueryPaid(msg.sender, msg.value, block.timestamp, zone);

        if (msg.value > parkingQueryPrice) {
            payable(msg.sender).transfer(msg.value - parkingQueryPrice);
        }
    }

    function withdraw() external {
        require(msg.sender == municipality, "Only municipality");
        payable(municipality).transfer(address(this).balance);
    }

    function setQueryPrice(uint256 _newPrice) external {
        require(msg.sender == municipality, "Only municipality");
        queryPrice = _newPrice;
    }

    function setParkingQueryPrice(uint256 _newPrice) external {
        require(msg.sender == municipality, "Only municipality");
        parkingQueryPrice = _newPrice;
    }

    function getStats() external view returns (
        uint256 _totalQueries,
        uint256 _totalRevenue,
        uint256 _queryPrice,
        uint256 _balance
    ) {
        return (totalQueries + totalParkingQueries, totalRevenue, queryPrice, address(this).balance);
    }

    function getParkingStats() external view returns (
        uint256 _totalParkingQueries,
        uint256 _parkingQueryPrice
    ) {
        return (totalParkingQueries, parkingQueryPrice);
    }
}
