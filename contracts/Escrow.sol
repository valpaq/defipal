//SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

/// @title Escrow contract
/// @author Freezy-Ex (https://github.com/FreezyEx)
/// @notice A smart contract that can be used as an escrow

contract Escrow{
    
    // list of moderators
    mapping(address => bool) private moderators;
    
    mapping(bytes32 => EscrowStruct) public buyerDatabase;
    
    address public feeCollector; // Collected taxes will be forwarded here

    enum Status { PENDING, IN_DISPUTE, COMPLETED, REFUNDED }
    
    struct EscrowTax {
        uint256 buyerTax;
        uint256 sellerTax;
    }
    
    struct EscrowStruct {
        address buyer;      //the address of the buyer
        address seller;     //the address of the seller
        uint256 amount;     //the price of the order
        uint256 tax_amount; //the amount in BNB of the tax
        uint256 deliveryTimestamp; //the timestamp of the delivery
        Status status;      //the current status of the order
    }
    
    
    EscrowTax public escrowTax = EscrowTax({
        buyerTax: 2,
        sellerTax: 2
    });
    
    modifier onlyModerators() {
       require(moderators[msg.sender],"Address is not moderator");
       _;
    }
    
    event OrderStarted(address buyer, address seller, bytes32 id, uint256 amount);
    event OrderDelivered(address buyer, bytes32 id, uint256 time);
    event RefundEmitted(address buyer, bytes32 id, uint256 amount);
    event ResolvedToSeller(address seller, bytes32 id, uint256 amount);
    event DeliveryConfirmed(address seller, bytes32 id, uint256 amount);
    
    constructor(address[] memory _moderators, address _feeCollector) {
        for(uint256 i; i< _moderators.length; i++){
            moderators[_moderators[i]] = true;
        }
        
        feeCollector = _feeCollector;
    }
    
    /// @notice Updates taxes for buyer and seller
    /// @dev Total tax must be <= 20%
    function setEscrowTax(uint256 _buyerTax, uint256 _sellerTax) external onlyModerators{
        require(_buyerTax + _sellerTax <= 20, "Total tax must be <= 20");
        escrowTax.buyerTax = _buyerTax;
        escrowTax.sellerTax = _sellerTax;
    }
    
    function setFeeCollector(address newAddress) external onlyModerators{
        feeCollector = newAddress;
    }
    
    function computerHash(address buyer, address seller, uint256 time) internal pure returns(bytes32){
        return keccak256(abi.encode(buyer, seller, time));
    }

    
    /// @notice Starts a new escrow service
    /// @param sellerAddress The address of the seller
    /// @param price The price of the service in BNB
    function startTrade(address sellerAddress, uint256 price) external payable returns(address, address, bytes32, uint256)
    {        
        require(price > 0 && msg.value == (price + (price*escrowTax.buyerTax / 100)), "Not right amount");
        address msgSender = msg.sender;
        uint256 blockTimestamp = block.timestamp;
        bytes32 _txId = computerHash(msgSender, sellerAddress, blockTimestamp);
        uint256 _tax_amount = price * escrowTax.buyerTax / 100;
        // there was a 0, where now blockTimestamp. It's a mistake, because if deliver offer is not done, that no disputes can be created
        // easy fraud and loosing money
        buyerDatabase[_txId] = EscrowStruct(msgSender, sellerAddress, price, _tax_amount, blockTimestamp, Status.PENDING);
        emit OrderStarted(msgSender, sellerAddress, _txId, price);
        return (msgSender, sellerAddress, _txId, price);
    }
    
    /// @notice Deliver the order and set the delivery timestamp
    /// @param _txId The id of the order
    function deliverOrder(bytes32 _txId) external{
        uint256 blockTimestamp = block.timestamp;
        EscrowStruct memory escrow = buyerDatabase[_txId];
        require(msg.sender == escrow.seller, "Only seller can deliver");
        require(escrow.status == Status.PENDING);
        buyerDatabase[_txId].deliveryTimestamp = blockTimestamp;
        emit OrderDelivered(escrow.buyer, _txId, blockTimestamp);
    }
    
    /// @notice Open a dispute, if this is done in 48h from delivery
    /// @param _txId The id of the order
    function openDispute(bytes32 _txId) external {
        EscrowStruct memory escrow = buyerDatabase[_txId];
        require(escrow.status == Status.PENDING);
        require(msg.sender == escrow.buyer, "Only buyer can open dispute");
        require(block.timestamp < escrow.deliveryTimestamp + 48 hours, "Dispute must be opened in 48h after delivery");
        buyerDatabase[_txId].status = Status.IN_DISPUTE;
    }
    
    /// @notice Refunds the escrow. Only moderators or seller can call this
    /// @param _txId The id of the order
    function refundBuyer(bytes32 _txId) external {
        EscrowStruct memory escrow = buyerDatabase[_txId];
        require(msg.sender == escrow.seller || moderators[msg.sender], "Only seller or moderator can refund");
        require(escrow.status == Status.IN_DISPUTE || escrow.status == Status.PENDING);
        uint256 amountToRefund = escrow.amount - escrow.tax_amount;
        buyerDatabase[_txId].status = Status.REFUNDED;
        payable(escrow.buyer).transfer(amountToRefund);
        emit RefundEmitted(escrow.buyer, _txId, amountToRefund);
    }
    
    /// @notice Resolve the dispute in favor of the seller
    /// @param _txId The id of the order

    function resolveToSeller(bytes32 _txId) external onlyModerators{
        EscrowStruct memory escrow = buyerDatabase[_txId];
        require(escrow.status == Status.IN_DISPUTE);
        uint256 taxAmount = escrow.amount * escrowTax.sellerTax / 100;
        uint256 amountToRelease = escrow.amount - taxAmount;
        collectFees(taxAmount);
        payable(escrow.seller).transfer(amountToRelease);
        emit ResolvedToSeller(escrow.seller, _txId, amountToRelease);
    }
    
    /// @notice Confirm the delivery and forward funds to seller
    /// @param _txId The id of the order
    function confirmDelivery(bytes32 _txId) external{
        EscrowStruct memory escrow = buyerDatabase[_txId];
        require(msg.sender == escrow.buyer, "Only buyer can confirm delivery");
        require(escrow.status == Status.PENDING);
        buyerDatabase[_txId].status = Status.COMPLETED;
        uint256 taxAmount = escrow.amount * escrowTax.sellerTax / 100;
        uint256 amountToRelease = escrow.amount - taxAmount;// there was a +, a mistake
        collectFees(taxAmount);
        payable(escrow.seller).transfer(amountToRelease);
        emit DeliveryConfirmed(escrow.seller, _txId, amountToRelease);
    }
    
    /// @notice Collects fees and forward to feeCollector
    function collectFees(uint256 amount) internal{
        require(amount > 0);
        payable(feeCollector).transfer(amount);
    }

}