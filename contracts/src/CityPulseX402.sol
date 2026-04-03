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

    event QueryPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event ParkingQueryPriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(uint256 _queryPrice) {
        municipality = msg.sender;
        queryPrice = _queryPrice;
        parkingQueryPrice = _queryPrice / 10;
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
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - cost}("");
            require(refundSuccess, "Refund failed");
        }
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

    function setQueryPrice(uint256 _newPrice) external {
        require(msg.sender == municipality, "Only municipality");
        uint256 oldPrice = queryPrice;
        queryPrice = _newPrice;
        emit QueryPriceUpdated(oldPrice, _newPrice);
    }

    function setParkingQueryPrice(uint256 _newPrice) external {
        require(msg.sender == municipality, "Only municipality");
        uint256 oldPrice = parkingQueryPrice;
        parkingQueryPrice = _newPrice;
        emit ParkingQueryPriceUpdated(oldPrice, _newPrice);
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
