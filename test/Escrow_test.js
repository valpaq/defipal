const {expect} = require("chai");
const chai = require("chai");
const chaiAlmost = require("chai-almost");
chai.use(chaiAlmost(0.1));
function ether(eth) {
  let weiAmount = ethers.utils.parseEther(eth)
  return weiAmount;
}

function comparableEth(eth) {
  let newEth = ethers.utils.formatEther(eth);
  return parseFloat(newEth);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


describe("Escrow", function () {

  let txId;
  let msgSender;
  let sellerAddress;
  let initialBalance1;
  let initialBalance2;

  before(async function () {
    Token = await ethers.getContractFactory("Escrow");
    [owner, moder1, moder2, feeCollector, seller1, seller2, addr1, addr2, addr3, addr4, addr5, addr6, ...addrs] = await ethers.getSigners();
    token = await Token.deploy([moder1.address, moder2.address], feeCollector.address);

  });

  describe("scenario 1_1", function() {
    it("startTrade", async function() {
      initialBalance1 = await seller1.getBalance();
      initialBalance2 = await addr2.getBalance();

      let tx = await token.connect(addr2).startTrade(seller1.address, ether("0.1"), {
        value: ethers.utils.parseEther("0.102")
      });
      const eventFilter = token.filters.OrderStarted();
      const events = await token.queryFilter(eventFilter, "latest");
      const msgSender = events[0].args["buyer"];
      const sellerAddress = events[0].args["seller"];
      txId = events[0].args["id"];
      expect(msgSender).to.be.equal(addr2.address);
      expect(sellerAddress).to.be.equal(seller1.address);      
      
    });
    it("deliverOrder", async function() {
      await token.connect(seller1).deliverOrder(txId);
      const eventFilter = token.filters.OrderDelivered();
      const events = await token.queryFilter(eventFilter, "latest");
      const msgSender = events[0].args["buyer"];
      txId = events[0].args["id"];
      expect(msgSender).to.be.equal(addr2.address); 
    });
    it("confirmDelivery", async function() {
      await token.connect(addr2).confirmDelivery(txId);
      const eventFilter = token.filters.DeliveryConfirmed();
      const events = await token.queryFilter(eventFilter, "latest");
      const sellerAddress = events[0].args["seller"];
      amountToRelease = events[0].args["amount"];
      expect(sellerAddress).to.be.equal(seller1.address);   
      expect(amountToRelease).to.be.equal(ether("0.098"));
    });
    it("check balances", async function() {
      
      newbalance1 = await seller1.getBalance();
      newbalance2 = await addr2.getBalance();

      newbalance1 = await ethers.utils.formatEther(newbalance1);
      newbalance2 = await ethers.utils.formatEther(newbalance2);
      
      initialBalance1 = await ethers.utils.formatEther(initialBalance1);
      initialBalance2 = await ethers.utils.formatEther(initialBalance2);

      newbalance1 = parseFloat(newbalance1);
      newbalance2 = parseFloat(newbalance2);
      initialBalance1 = parseFloat(initialBalance1);
      initialBalance2 = parseFloat(initialBalance2);
      expect(newbalance1).to.be.greaterThan(initialBalance1);
      expect(newbalance2).to.be.lessThan(initialBalance2);
      expect(newbalance1).to.be.almost.equal(10000.098);
      expect(newbalance2).to.be.almost.equal(9999.898);
    });
  });
  describe("update", function() {
    it("update", async function() {
      Token = await ethers.getContractFactory("Escrow");
      [owner, moder1, moder2, feeCollector, seller1, seller2, addr1, addr2, addr3, addr4, addr5, addr6, ...addrs] = await ethers.getSigners();
      token = await Token.deploy([moder1.address, moder2.address], feeCollector.address);

    });
  });
  describe("scenario 1_2", function() {
    it("startTrade", async function() {
      initialBalance1 = await seller1.getBalance();
      initialBalance2 = await addr2.getBalance();

      let tx = await token.connect(addr2).startTrade(seller1.address, ether("0.2"), {
        value: ethers.utils.parseEther("0.204")
      });
      const eventFilter = token.filters.OrderStarted();
      const events = await token.queryFilter(eventFilter, "latest");
      const msgSender = events[0].args["buyer"];
      const sellerAddress = events[0].args["seller"];
      txId = events[0].args["id"];
      expect(msgSender).to.be.equal(addr2.address);
      expect(sellerAddress).to.be.equal(seller1.address);      
      
    });
    it("deliverOrder", async function() {
      await token.connect(seller1).deliverOrder(txId);
      const eventFilter = token.filters.OrderDelivered();
      const events = await token.queryFilter(eventFilter, "latest");
      const msgSender = events[0].args["buyer"];
      txId = events[0].args["id"];
      expect(msgSender).to.be.equal(addr2.address); 
    });
    it("confirmDelivery", async function() {
      await token.connect(addr2).openDispute(txId);
    });
    it("refundBuyer", async function(){
      await token.connect(seller1).refundBuyer(txId);
      const eventFilter = token.filters.RefundEmitted();
      const events = await token.queryFilter(eventFilter, "latest");
      buyer = events[0].args["buyer"];
      amountToRefund = events[0].args["amount"];
      expect(buyer).to.be.equal(addr2.address);   
      expect(amountToRefund).to.be.equal(ether("0.196"));
    });
    it("check balances", async function() {
      
      newbalance1 = await seller1.getBalance();
      newbalance2 = await addr2.getBalance();

      newbalance1 = await ethers.utils.formatEther(newbalance1);
      newbalance2 = await ethers.utils.formatEther(newbalance2);
      
      initialBalance1 = await ethers.utils.formatEther(initialBalance1);
      initialBalance2 = await ethers.utils.formatEther(initialBalance2);

      newbalance1 = parseFloat(newbalance1);
      newbalance2 = parseFloat(newbalance2);
      initialBalance1 = parseFloat(initialBalance1);
      initialBalance2 = parseFloat(initialBalance2);
      //expect(newbalance2).to.be.greaterThan(initialBalance2);
      // expect(newbalance1).to.be.lessThan(initialBalance1);
      expect(newbalance2).to.be.almost.equal(9999.897);
      expect(newbalance1).to.be.almost.equal(10000);
      expect(initialBalance1).to.be.almost.equal(10000.098);
      expect(initialBalance2).to.be.almost.equal(9999.898);
    });
  });
  
  describe("update", function() {
    it("update", async function() {
      Token = await ethers.getContractFactory("Escrow");
      [owner, moder1, moder2, feeCollector, seller1, seller2, addr1, addr2, addr3, addr4, addr5, addr6, ...addrs] = await ethers.getSigners();
      token = await Token.deploy([moder1.address, moder2.address], feeCollector.address);

    });
  });

  describe("scenario 1_3", function() {
    it("startTrade", async function() {
      initialBalance1 = await seller1.getBalance();
      initialBalance2 = await addr2.getBalance();

      let tx = await token.connect(addr2).startTrade(seller1.address, ether("0.2"), {
        value: ethers.utils.parseEther("0.204")
      });
      const eventFilter = token.filters.OrderStarted();
      const events = await token.queryFilter(eventFilter, "latest");
      const msgSender = events[0].args["buyer"];
      const sellerAddress = events[0].args["seller"];
      txId = events[0].args["id"];
      expect(msgSender).to.be.equal(addr2.address);
      expect(sellerAddress).to.be.equal(seller1.address);      
      
    });
    it("deliverOrder", async function() {
      await token.connect(seller1).deliverOrder(txId);
      const eventFilter = token.filters.OrderDelivered();
      const events = await token.queryFilter(eventFilter, "latest");
      const msgSender = events[0].args["buyer"];
      txId = events[0].args["id"];
      expect(msgSender).to.be.equal(addr2.address); 
    });
    it("confirmDelivery", async function() {
      await token.connect(addr2).openDispute(txId);
    });
    it("resolveToSeller", async function(){
      await token.connect(moder1).resolveToSeller(txId);
      const eventFilter = token.filters.ResolvedToSeller();
      const events = await token.queryFilter(eventFilter, "latest");
      seller = events[0].args["seller"];
      amountToRefund = events[0].args["amount"];
      expect(buyer).to.be.equal(addr2.address);   
      expect(amountToRefund).to.be.equal(ether("0.196"));
    });
    it("check balances", async function() {
      
      newbalance1 = await seller1.getBalance();
      newbalance2 = await addr2.getBalance();

      newbalance1 = await ethers.utils.formatEther(newbalance1);
      newbalance2 = await ethers.utils.formatEther(newbalance2);
      
      initialBalance1 = await ethers.utils.formatEther(initialBalance1);
      initialBalance2 = await ethers.utils.formatEther(initialBalance2);

      newbalance1 = parseFloat(newbalance1);
      newbalance2 = parseFloat(newbalance2);
      initialBalance1 = parseFloat(initialBalance1);
      initialBalance2 = parseFloat(initialBalance2);
      expect(newbalance1).to.be.greaterThan(initialBalance1);
      expect(newbalance2).to.be.lessThan(initialBalance2);
      expect(newbalance1).to.be.almost.equal(10000.294);
      expect(newbalance2).to.be.almost.equal(9999.697);
    });
  });
});
