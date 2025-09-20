import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { InfoTrade, InfoTrade__factory, InfoEncoder, InfoEncoder__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  seller: HardhatEthersSigner;
  buyer1: HardhatEthersSigner;
  buyer2: HardhatEthersSigner;
};

async function deployFixture() {
  // Deploy InfoTrade contract
  const infoTradeFactory = (await ethers.getContractFactory("InfoTrade")) as InfoTrade__factory;
  const infoTradeContract = (await infoTradeFactory.deploy()) as InfoTrade;
  const infoTradeContractAddress = await infoTradeContract.getAddress();

  // Deploy InfoEncoder contract
  const infoEncoderFactory = (await ethers.getContractFactory("InfoEncoder")) as InfoEncoder__factory;
  const infoEncoderContract = (await infoEncoderFactory.deploy()) as InfoEncoder;
  const infoEncoderContractAddress = await infoEncoderContract.getAddress();

  return {
    infoTradeContract,
    infoTradeContractAddress,
    infoEncoderContract,
    infoEncoderContractAddress,
  };
}

describe("InfoTrade", function () {
  let signers: Signers;
  let infoTradeContract: InfoTrade;
  let infoTradeContractAddress: string;
  let infoEncoderContract: InfoEncoder;
  let infoEncoderContractAddress: string;

  const testMessage = "This is secret information worth 1 ETH";
  const testPrice = ethers.parseEther("1.0"); // 1 ETH

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      seller: ethSigners[1],
      buyer1: ethSigners[2],
      buyer2: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({
      infoTradeContract,
      infoTradeContractAddress,
      infoEncoderContract,
      infoEncoderContractAddress,
    } = await deployFixture());
  });

  describe("Contract Deployment", function () {
    it("should deploy with correct initial state", async function () {
      const [nextInfoId, platformBalance] = await infoTradeContract.getPlatformStats();
      expect(nextInfoId).to.eq(1n);
      expect(platformBalance).to.eq(0n);

      const owner = await infoTradeContract.owner();
      expect(owner).to.eq(signers.deployer.address);
    });
  });

  describe("String to Address Conversion", function () {
    it("should convert string to address consistently", async function () {
      const address1 = await infoEncoderContract.encodeString(testMessage);
      const address2 = await infoEncoderContract.encodeString(testMessage);
      expect(address1).to.eq(address2);
    });

    it("should verify string encoding correctly", async function () {
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const isValid = await infoEncoderContract.verifyEncoding(testMessage, encodedAddress);
      expect(isValid).to.be.true;

      const isInvalid = await infoEncoderContract.verifyEncoding("different string", encodedAddress);
      expect(isInvalid).to.be.false;
    });

    it("should handle batch encoding", async function () {
      const strings = ["message1", "message2", "message3"];
      const addresses = await infoEncoderContract.batchEncodeStrings(strings);
      expect(addresses.length).to.eq(3);

      // Verify each encoding
      for (let i = 0; i < strings.length; i++) {
        const singleAddress = await infoEncoderContract.encodeString(strings[i]);
        expect(addresses[i]).to.eq(singleAddress);
      }
    });
  });

  describe("Information Upload", function () {
    it("should upload encrypted information successfully", async function () {
      // Convert string to address for encryption
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);

      // Create encrypted input for the address
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
        .addAddress(encodedAddress)
        .encrypt();

      // Upload the encrypted information
      const tx = await infoTradeContract
        .connect(signers.seller)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      // Check platform stats
      const [nextInfoId] = await infoTradeContract.getPlatformStats();
      expect(nextInfoId).to.eq(2n);

      // Check info basics
      const [seller, price, isActive, createdAt] = await infoTradeContract.getInfoBasics(1);
      expect(seller).to.eq(signers.seller.address);
      expect(price).to.eq(testPrice);
      expect(isActive).to.be.true;
      expect(createdAt).to.be.greaterThan(0);
    });

    it("should fail to upload with zero price", async function () {
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
        .addAddress(encodedAddress)
        .encrypt();

      await expect(
        infoTradeContract
          .connect(signers.seller)
          .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, 0)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("should track seller's information items", async function () {
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.seller)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      const sellerInfos = await infoTradeContract.getSellerInfos(signers.seller.address);
      expect(sellerInfos.length).to.eq(1);
      expect(sellerInfos[0]).to.eq(1n);
    });
  });

  describe("Purchase Request", function () {
    let infoId: bigint;

    beforeEach(async function () {
      // Upload test information
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.seller)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      infoId = 1n;
    });

    it("should create purchase request successfully", async function () {
      const tx = await infoTradeContract
        .connect(signers.buyer1)
        .requestPurchase(infoId, { value: testPrice });

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      // Check purchase request status
      const [isPending, isApproved, timestamp] = await infoTradeContract.getPurchaseRequestStatus(
        infoId,
        signers.buyer1.address
      );
      expect(isPending).to.be.true;
      expect(isApproved).to.be.false;
      expect(timestamp).to.be.greaterThan(0);
    });

    it("should fail with insufficient payment", async function () {
      const insufficientPayment = ethers.parseEther("0.5");
      await expect(
        infoTradeContract.connect(signers.buyer1).requestPurchase(infoId, { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("should fail if seller tries to buy own info", async function () {
      await expect(
        infoTradeContract.connect(signers.seller).requestPurchase(infoId, { value: testPrice })
      ).to.be.revertedWith("Cannot purchase own info");
    });

    it("should fail if buyer already has pending request", async function () {
      // First request
      await infoTradeContract.connect(signers.buyer1).requestPurchase(infoId, { value: testPrice });

      // Second request should fail
      await expect(
        infoTradeContract.connect(signers.buyer1).requestPurchase(infoId, { value: testPrice })
      ).to.be.revertedWith("Purchase already pending");
    });

    it("should show pending requests to seller", async function () {
      // Create multiple purchase requests
      await infoTradeContract.connect(signers.buyer1).requestPurchase(infoId, { value: testPrice });
      await infoTradeContract.connect(signers.buyer2).requestPurchase(infoId, { value: testPrice });

      const pendingRequests = await infoTradeContract.connect(signers.seller).getPendingRequests(infoId);
      expect(pendingRequests.length).to.eq(2);
      expect(pendingRequests).to.include(signers.buyer1.address);
      expect(pendingRequests).to.include(signers.buyer2.address);
    });
  });

  describe("Access Management", function () {
    let infoId: bigint;

    beforeEach(async function () {
      // Upload test information and create purchase request
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.seller)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      infoId = 1n;

      await infoTradeContract.connect(signers.buyer1).requestPurchase(infoId, { value: testPrice });
    });

    it("should grant access and transfer payment", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(signers.seller.address);
      const contractBalanceBefore = await ethers.provider.getBalance(infoTradeContractAddress);

      const tx = await infoTradeContract
        .connect(signers.seller)
        .grantAccess(infoId, signers.buyer1.address);

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      // Check request status
      const [isPending, isApproved] = await infoTradeContract.getPurchaseRequestStatus(
        infoId,
        signers.buyer1.address
      );
      expect(isPending).to.be.false;
      expect(isApproved).to.be.true;

      // Check payment transfer
      const sellerBalanceAfter = await ethers.provider.getBalance(signers.seller.address);
      const [, platformBalance] = await infoTradeContract.getPlatformStats();

      const expectedFee = (testPrice * 2n) / 100n; // 2% platform fee
      const expectedSellerAmount = testPrice - expectedFee;

      expect(platformBalance).to.eq(expectedFee);
      // Note: We don't check exact balance due to gas costs, but ensure it increased
      expect(sellerBalanceAfter).to.be.greaterThan(sellerBalanceBefore);
    });

    it("should deny access and refund payment", async function () {
      const buyer1BalanceBefore = await ethers.provider.getBalance(signers.buyer1.address);

      const tx = await infoTradeContract
        .connect(signers.seller)
        .denyAccess(infoId, signers.buyer1.address);

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      // Check request status
      const [isPending, isApproved] = await infoTradeContract.getPurchaseRequestStatus(
        infoId,
        signers.buyer1.address
      );
      expect(isPending).to.be.false;
      expect(isApproved).to.be.false;

      // Check refund (buyer balance should increase by testPrice)
      const buyer1BalanceAfter = await ethers.provider.getBalance(signers.buyer1.address);
      expect(buyer1BalanceAfter).to.be.greaterThan(buyer1BalanceBefore);
    });

    it("should fail if non-seller tries to grant access", async function () {
      await expect(
        infoTradeContract.connect(signers.buyer2).grantAccess(infoId, signers.buyer1.address)
      ).to.be.revertedWith("Only info seller can call this function");
    });

    it("should fail if no pending request exists", async function () {
      await expect(
        infoTradeContract.connect(signers.seller).grantAccess(infoId, signers.buyer2.address)
      ).to.be.revertedWith("No pending request from this buyer");
    });
  });

  describe("Information Access", function () {
    let infoId: bigint;

    beforeEach(async function () {
      // Upload and grant access to information
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.seller)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      infoId = 1n;

      await infoTradeContract.connect(signers.buyer1).requestPurchase(infoId, { value: testPrice });
      await infoTradeContract.connect(signers.seller).grantAccess(infoId, signers.buyer1.address);
    });

    it("should allow authorized user to access encrypted information", async function () {
      const encryptedInfo = await infoTradeContract.connect(signers.buyer1).getEncryptedInfo(infoId);
      expect(encryptedInfo).to.not.eq(ethers.ZeroHash);

      // Note: In actual implementation, decryption would be handled client-side
      // For test purposes, we verify the encrypted info handle is accessible
      console.log(`Encrypted info accessible to buyer: ${encryptedInfo}`);
    });

    it("should allow seller to access their own information", async function () {
      const encryptedInfo = await infoTradeContract.connect(signers.seller).getEncryptedInfo(infoId);
      expect(encryptedInfo).to.not.eq(ethers.ZeroHash);

      // Note: In actual implementation, decryption would be handled client-side
      // For test purposes, we verify the seller can access their encrypted info
      console.log(`Encrypted info accessible to seller: ${encryptedInfo}`);
    });
  });

  describe("Information Management", function () {
    let infoId: bigint;

    beforeEach(async function () {
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.seller)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      infoId = 1n;
    });

    it("should deactivate information", async function () {
      const tx = await infoTradeContract.connect(signers.seller).deactivateInfo(infoId);
      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      const [, , isActive] = await infoTradeContract.getInfoBasics(infoId);
      expect(isActive).to.be.false;
    });

    it("should prevent purchase of deactivated information", async function () {
      await infoTradeContract.connect(signers.seller).deactivateInfo(infoId);

      await expect(
        infoTradeContract.connect(signers.buyer1).requestPurchase(infoId, { value: testPrice })
      ).to.be.revertedWith("Info is not active");
    });

    it("should fail if non-seller tries to deactivate", async function () {
      await expect(infoTradeContract.connect(signers.buyer1).deactivateInfo(infoId)).to.be.revertedWith(
        "Only info seller can call this function"
      );
    });
  });

  describe("Platform Management", function () {
    it("should allow owner to withdraw platform fees", async function () {
      // Create a transaction that generates platform fees
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.seller)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      const infoId = 1n;
      await infoTradeContract.connect(signers.buyer1).requestPurchase(infoId, { value: testPrice });
      await infoTradeContract.connect(signers.seller).grantAccess(infoId, signers.buyer1.address);

      const ownerBalanceBefore = await ethers.provider.getBalance(signers.deployer.address);

      const tx = await infoTradeContract.connect(signers.deployer).withdrawPlatformFees();
      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      const [, platformBalance] = await infoTradeContract.getPlatformStats();
      expect(platformBalance).to.eq(0n);

      const ownerBalanceAfter = await ethers.provider.getBalance(signers.deployer.address);
      expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
    });

    it("should fail if non-owner tries to withdraw fees", async function () {
      await expect(infoTradeContract.connect(signers.seller).withdrawPlatformFees()).to.be.revertedWith(
        "Only owner can call this function"
      );
    });

    it("should fail to withdraw when no fees available", async function () {
      await expect(infoTradeContract.connect(signers.deployer).withdrawPlatformFees()).to.be.revertedWith(
        "No fees to withdraw"
      );
    });
  });

  describe("Edge Cases", function () {
    it("should handle non-existent info ID", async function () {
      await expect(infoTradeContract.getInfoBasics(999)).to.be.revertedWith("Info does not exist");
    });

    it("should handle multiple info items from same seller", async function () {
      const messages = ["Message 1", "Message 2", "Message 3"];
      
      for (const message of messages) {
        const encodedAddress = await infoEncoderContract.encodeString(message);
        const encryptedInput = await fhevm
          .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
          .addAddress(encodedAddress)
          .encrypt();

        await infoTradeContract
          .connect(signers.seller)
          .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);
      }

      const sellerInfos = await infoTradeContract.getSellerInfos(signers.seller.address);
      expect(sellerInfos.length).to.eq(3);
      expect(sellerInfos[0]).to.eq(1n);
      expect(sellerInfos[1]).to.eq(2n);
      expect(sellerInfos[2]).to.eq(3n);
    });

    it("should handle overpayment correctly", async function () {
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.seller.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.seller)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      const overpayment = ethers.parseEther("2.0");
      const tx = await infoTradeContract
        .connect(signers.buyer1)
        .requestPurchase(1n, { value: overpayment });

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      // Check that request was created successfully
      const [isPending] = await infoTradeContract.getPurchaseRequestStatus(1n, signers.buyer1.address);
      expect(isPending).to.be.true;
    });
  });
});