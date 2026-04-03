// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CityPulseX402.sol";

contract CityPulseX402Test is Test {
    CityPulseX402 public cityPulse;

    address public municipality;
    address public driver;
    address public stranger;

    uint256 public constant QUERY_PRICE = 1000; // 0.001 USDC (6 decimals)

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

    event QueryPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event ParkingQueryPriceUpdated(uint256 oldPrice, uint256 newPrice);

    function setUp() public {
        municipality = address(this);
        driver = makeAddr("driver");
        stranger = makeAddr("stranger");

        cityPulse = new CityPulseX402(QUERY_PRICE);

        vm.deal(driver, 10_000_000); // 10 USDC (6 decimals)
        vm.deal(stranger, 10_000_000); // 10 USDC (6 decimals)
    }

    // ==================== Deployment Tests ====================

    function test_deployment_municipalitySetCorrectly() public view {
        assertEq(cityPulse.municipality(), municipality);
    }

    function test_deployment_queryPriceSetCorrectly() public view {
        assertEq(cityPulse.queryPrice(), QUERY_PRICE);
    }

    function test_deployment_initialStatsAreZero() public view {
        assertEq(cityPulse.totalQueries(), 0);
        assertEq(cityPulse.totalRevenue(), 0);
    }

    // ==================== payForRoute Tests ====================

    function test_payForRoute_correctPayment() public {
        uint256 vehicles = 5;
        uint256 cost = QUERY_PRICE * vehicles;

        vm.prank(driver);
        cityPulse.payForRoute{value: cost}("zone-A", "zone-B", vehicles);

        assertEq(cityPulse.totalQueries(), 1);
        assertEq(cityPulse.totalRevenue(), cost);
        assertEq(address(cityPulse).balance, cost);
    }

    function test_payForRoute_emitsQueryPaidEvent() public {
        uint256 vehicles = 3;
        uint256 cost = QUERY_PRICE * vehicles;

        vm.prank(driver);
        vm.expectEmit(true, false, false, true);
        emit QueryPaid(driver, cost, block.timestamp, "downtown", "airport", vehicles);
        cityPulse.payForRoute{value: cost}("downtown", "airport", vehicles);
    }

    function test_payForRoute_statsUpdateAfterMultiplePayments() public {
        uint256 vehicles1 = 2;
        uint256 cost1 = QUERY_PRICE * vehicles1;
        uint256 vehicles2 = 4;
        uint256 cost2 = QUERY_PRICE * vehicles2;

        vm.prank(driver);
        cityPulse.payForRoute{value: cost1}("zone-A", "zone-B", vehicles1);

        vm.prank(driver);
        cityPulse.payForRoute{value: cost2}("zone-C", "zone-D", vehicles2);

        assertEq(cityPulse.totalQueries(), 2);
        assertEq(cityPulse.totalRevenue(), cost1 + cost2);
    }

    function test_payForRoute_insufficientPaymentReverts() public {
        uint256 vehicles = 5;
        uint256 insufficientAmount = QUERY_PRICE * vehicles - 1;

        vm.prank(driver);
        vm.expectRevert("Insufficient payment");
        cityPulse.payForRoute{value: insufficientAmount}("zone-A", "zone-B", vehicles);
    }

    function test_payForRoute_zeroPaymentForZeroVehicles() public {
        vm.prank(driver);
        cityPulse.payForRoute{value: 0}("zone-A", "zone-B", 0);

        assertEq(cityPulse.totalQueries(), 1);
        assertEq(cityPulse.totalRevenue(), 0);
    }

    function test_payForRoute_excessPaymentRefunded() public {
        uint256 vehicles = 2;
        uint256 cost = QUERY_PRICE * vehicles;
        uint256 overpayment = 1_000_000; // 1 USDC (6 decimals)

        uint256 driverBalanceBefore = driver.balance;

        vm.prank(driver);
        cityPulse.payForRoute{value: overpayment}("zone-A", "zone-B", vehicles);

        // Contract should only hold the exact cost
        assertEq(address(cityPulse).balance, cost);

        // Driver should have been refunded the excess
        uint256 driverBalanceAfter = driver.balance;
        assertEq(driverBalanceAfter, driverBalanceBefore - cost);

        // totalRevenue records the overpayment (msg.value), which is the full amount sent
        assertEq(cityPulse.totalRevenue(), overpayment);
    }

    // ==================== withdraw Tests ====================

    function test_withdraw_onlyMunicipality() public {
        // Fund the contract
        uint256 cost = QUERY_PRICE * 3;
        vm.prank(driver);
        cityPulse.payForRoute{value: cost}("zone-A", "zone-B", 3);

        // Stranger cannot withdraw
        vm.prank(stranger);
        vm.expectRevert("Only municipality");
        cityPulse.withdraw();
    }

    function test_withdraw_transfersBalance() public {
        // Fund the contract
        uint256 cost = QUERY_PRICE * 5;
        vm.prank(driver);
        cityPulse.payForRoute{value: cost}("zone-A", "zone-B", 5);

        uint256 municipalityBalanceBefore = municipality.balance;
        uint256 contractBalance = address(cityPulse).balance;

        cityPulse.withdraw();

        assertEq(address(cityPulse).balance, 0);
        assertEq(municipality.balance, municipalityBalanceBefore + contractBalance);
    }

    function test_withdraw_emptyBalance() public {
        // Should not revert even with zero balance
        cityPulse.withdraw();
        assertEq(address(cityPulse).balance, 0);
    }

    // ==================== setQueryPrice Tests ====================

    function test_setQueryPrice_onlyMunicipality() public {
        vm.prank(stranger);
        vm.expectRevert("Only municipality");
        cityPulse.setQueryPrice(2000); // 0.002 USDC
    }

    function test_setQueryPrice_updatesPrice() public {
        uint256 newPrice = 5000; // 0.005 USDC
        cityPulse.setQueryPrice(newPrice);
        assertEq(cityPulse.queryPrice(), newPrice);
    }

    function test_setQueryPrice_newPriceUsedInPayments() public {
        uint256 newPrice = 5000; // 0.005 USDC
        cityPulse.setQueryPrice(newPrice);

        uint256 vehicles = 2;
        uint256 cost = newPrice * vehicles;

        vm.prank(driver);
        cityPulse.payForRoute{value: cost}("zone-A", "zone-B", vehicles);

        assertEq(address(cityPulse).balance, cost);
        assertEq(cityPulse.totalQueries(), 1);
    }

    function test_setQueryPrice_oldPriceInsufficientAfterIncrease() public {
        uint256 newPrice = 10000; // 0.01 USDC
        cityPulse.setQueryPrice(newPrice);

        uint256 vehicles = 2;
        uint256 oldCost = QUERY_PRICE * vehicles;

        vm.prank(driver);
        vm.expectRevert("Insufficient payment");
        cityPulse.payForRoute{value: oldCost}("zone-A", "zone-B", vehicles);
    }

    // ==================== getStats Tests ====================

    function test_getStats_initialValues() public view {
        (uint256 queries, uint256 revenue, uint256 price, uint256 balance) = cityPulse.getStats();

        assertEq(queries, 0);
        assertEq(revenue, 0);
        assertEq(price, QUERY_PRICE);
        assertEq(balance, 0);
    }

    function test_getStats_afterMultiplePayments() public {
        uint256 vehicles1 = 3;
        uint256 cost1 = QUERY_PRICE * vehicles1;
        vm.prank(driver);
        cityPulse.payForRoute{value: cost1}("zone-A", "zone-B", vehicles1);

        uint256 vehicles2 = 7;
        uint256 cost2 = QUERY_PRICE * vehicles2;
        vm.prank(driver);
        cityPulse.payForRoute{value: cost2}("zone-C", "zone-D", vehicles2);

        (uint256 queries, uint256 revenue, uint256 price, uint256 balance) = cityPulse.getStats();

        assertEq(queries, 2);
        assertEq(revenue, cost1 + cost2);
        assertEq(price, QUERY_PRICE);
        assertEq(balance, cost1 + cost2);
    }

    function test_getStats_balanceAfterWithdraw() public {
        uint256 cost = QUERY_PRICE * 5;
        vm.prank(driver);
        cityPulse.payForRoute{value: cost}("zone-A", "zone-B", 5);

        cityPulse.withdraw();

        (uint256 queries, uint256 revenue, uint256 price, uint256 balance) = cityPulse.getStats();

        assertEq(queries, 1);
        assertEq(revenue, cost);
        assertEq(price, QUERY_PRICE);
        assertEq(balance, 0);
    }

    // ==================== payForParking Tests ====================

    function test_payForParking_correctPayment() public {
        uint256 parkingPrice = cityPulse.parkingQueryPrice();

        vm.prank(driver);
        cityPulse.payForParking{value: parkingPrice}("Kadikoy");

        assertEq(cityPulse.totalParkingQueries(), 1);
        assertEq(address(cityPulse).balance, parkingPrice);
    }

    function test_payForParking_emitsParkingQueryPaidEvent() public {
        uint256 parkingPrice = cityPulse.parkingQueryPrice();

        vm.prank(driver);
        vm.expectEmit(true, false, false, true);
        emit ParkingQueryPaid(driver, parkingPrice, block.timestamp, "Besiktas");
        cityPulse.payForParking{value: parkingPrice}("Besiktas");
    }

    function test_payForParking_insufficientPaymentReverts() public {
        uint256 parkingPrice = cityPulse.parkingQueryPrice();

        vm.prank(driver);
        vm.expectRevert("Insufficient payment");
        cityPulse.payForParking{value: parkingPrice - 1}("Taksim");
    }

    function test_payForParking_excessRefunded() public {
        uint256 parkingPrice = cityPulse.parkingQueryPrice();
        uint256 overpay = parkingPrice * 10;
        uint256 driverBefore = driver.balance;

        vm.prank(driver);
        cityPulse.payForParking{value: overpay}("Eminonu");

        assertEq(address(cityPulse).balance, parkingPrice);
        assertEq(driver.balance, driverBefore - parkingPrice);
    }

    function test_payForParking_defaultPriceIsOnetenthOfQueryPrice() public view {
        assertEq(cityPulse.parkingQueryPrice(), QUERY_PRICE / 10);
    }

    function test_setParkingQueryPrice_onlyMunicipality() public {
        vm.prank(stranger);
        vm.expectRevert("Only municipality");
        cityPulse.setParkingQueryPrice(500);
    }

    function test_setParkingQueryPrice_updatesPrice() public {
        uint256 newPrice = 500;
        cityPulse.setParkingQueryPrice(newPrice);
        assertEq(cityPulse.parkingQueryPrice(), newPrice);
    }

    function test_getStats_includesParkingQueries() public {
        // Route payment
        uint256 routeCost = QUERY_PRICE * 2;
        vm.prank(driver);
        cityPulse.payForRoute{value: routeCost}("A", "B", 2);

        // Parking payment
        uint256 parkingPrice = cityPulse.parkingQueryPrice();
        vm.prank(driver);
        cityPulse.payForParking{value: parkingPrice}("C");

        (uint256 queries, uint256 revenue, , ) = cityPulse.getStats();
        // getStats returns totalQueries + totalParkingQueries
        assertEq(queries, 2); // 1 route + 1 parking
        assertEq(revenue, routeCost + parkingPrice);
    }

    function test_setQueryPrice_emitsEvent() public {
        uint256 newPrice = 5000;
        vm.expectEmit(false, false, false, true);
        emit QueryPriceUpdated(QUERY_PRICE, newPrice);
        cityPulse.setQueryPrice(newPrice);
    }

    function test_setParkingQueryPrice_emitsEvent() public {
        uint256 oldPrice = cityPulse.parkingQueryPrice();
        uint256 newPrice = 500;
        vm.expectEmit(false, false, false, true);
        emit ParkingQueryPriceUpdated(oldPrice, newPrice);
        cityPulse.setParkingQueryPrice(newPrice);
    }

    function test_getParkingStats_returnsCorrectValues() public {
        uint256 parkingPrice = cityPulse.parkingQueryPrice();

        vm.prank(driver);
        cityPulse.payForParking{value: parkingPrice}("X");

        vm.prank(driver);
        cityPulse.payForParking{value: parkingPrice}("Y");

        (uint256 parkingQueries, uint256 pPrice) = cityPulse.getParkingStats();
        assertEq(parkingQueries, 2);
        assertEq(pPrice, parkingPrice);
    }

    // ==================== Receive Native Token ====================

    receive() external payable {}
}
