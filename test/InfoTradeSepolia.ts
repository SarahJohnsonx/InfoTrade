import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { InfoTrade, InfoTrade__factory, InfoEncoder, InfoEncoder__factory } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const infoTradeFactory = (await ethers.getContractFactory("InfoTrade")) as InfoTrade__factory;
  const infoTradeContract = (await infoTradeFactory.deploy()) as InfoTrade;
  const infoTradeContractAddress = await infoTradeContract.getAddress();

  const infoEncoderFactory = (await ethers.getContractFactory("InfoEncoder")) as InfoEncoder__factory;
  const infoEncoderContract = (await infoEncoderFactory.deploy()) as InfoEncoder;

  return {
    infoTradeContract,
    infoTradeContractAddress,
    infoEncoderContract,
  };
}

describe("InfoTrade - Sepolia Integration Tests", function () {
  let signers: Signers;
  let infoTradeContract: InfoTrade;
  let infoTradeContractAddress: string;
  let infoEncoderContract: InfoEncoder;

  const testMessage = "Secret message for Sepolia testing";
  const testPrice = ethers.parseEther("0.001"); // Smaller amount for testnet

  before(async function () {
    // Skip if not on Sepolia network
    if (fhevm.isMock) {
      console.warn("This test suite is only for Sepolia testnet");
      this.skip();
      return;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };

    // Check if we have enough signers
    if (ethSigners.length < 3) {
      throw new Error("Need at least 3 signers for Sepolia tests");
    }

    // Check balances
    for (const [name, signer] of Object.entries(signers)) {
      const balance = await ethers.provider.getBalance(signer.address);
      console.log(`${name} balance: ${ethers.formatEther(balance)} ETH`);
      
      if (balance < ethers.parseEther("0.01")) {
        console.warn(`Warning: ${name} has low balance: ${ethers.formatEther(balance)} ETH`);
      }
    }
  });

  beforeEach(async function () {
    if (fhevm.isMock) {
      this.skip();
      return;
    }

    ({ infoTradeContract, infoTradeContractAddress, infoEncoderContract } = await deployFixture());
  });

  describe("Sepolia Deployment", function () {
    it("should deploy contracts successfully on Sepolia", async function () {
      expect(await infoTradeContract.getAddress()).to.be.properAddress;
      expect(await infoEncoderContract.getAddress()).to.be.properAddress;

      const [nextInfoId, platformBalance] = await infoTradeContract.getPlatformStats();
      expect(nextInfoId).to.eq(1n);
      expect(platformBalance).to.eq(0n);
    });

    it("should have correct owner on Sepolia", async function () {
      const owner = await infoTradeContract.owner();
      expect(owner).to.eq(signers.deployer.address);
    });
  });

  describe("String Encoding on Sepolia", function () {
    it("should encode and verify strings on Sepolia", async function () {
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      expect(encodedAddress).to.be.properAddress;

      const isValid = await infoEncoderContract.verifyEncoding(testMessage, encodedAddress);
      expect(isValid).to.be.true;

      console.log(`Encoded "${testMessage}" to address: ${encodedAddress}`);
    });

    it("should handle batch encoding on Sepolia", async function () {
      const messages = ["Message 1", "Message 2", "Message 3"];
      const addresses = await infoEncoderContract.batchEncodeStrings(messages);
      
      expect(addresses.length).to.eq(3);
      for (const addr of addresses) {
        expect(addr).to.be.properAddress;
      }

      console.log("Batch encoded addresses:", addresses);
    });
  });

  describe("Information Upload on Sepolia", function () {
    it("should upload encrypted information on Sepolia", async function () {
      // Encode the message to address
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      
      // Create encrypted input
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
        .addAddress(encodedAddress)
        .encrypt();

      console.log("Uploading encrypted information...");
      console.log(`Encoded address: ${encodedAddress}`);
      console.log(`Price: ${ethers.formatEther(testPrice)} ETH`);

      // Upload the information
      const tx = await infoTradeContract
        .connect(signers.alice)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      console.log("Transaction hash:", tx.hash);

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      console.log(`Gas used: ${receipt?.gasUsed}`);

      // Verify upload
      const [seller, price, isActive, createdAt] = await infoTradeContract.getInfoBasics(1);
      expect(seller).to.eq(signers.alice.address);
      expect(price).to.eq(testPrice);
      expect(isActive).to.be.true;

      console.log("Information uploaded successfully!");
      console.log(`Info ID: 1`);
      console.log(`Seller: ${seller}`);
      console.log(`Price: ${ethers.formatEther(price)} ETH`);
      console.log(`Created at: ${new Date(Number(createdAt) * 1000).toISOString()}`);
    });
  });

  describe("Purchase Flow on Sepolia", function () {
    let infoId: bigint;

    beforeEach(async function () {
      if (fhevm.isMock) {
        this.skip();
        return;
      }

      // Upload test information
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.alice)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      infoId = 1n;
    });

    it("should handle purchase request on Sepolia", async function () {
      console.log(`Requesting purchase of info ID ${infoId}...`);

      const bobBalanceBefore = await ethers.provider.getBalance(signers.bob.address);
      console.log(`Bob's balance before: ${ethers.formatEther(bobBalanceBefore)} ETH`);

      const tx = await infoTradeContract
        .connect(signers.bob)
        .requestPurchase(infoId, { value: testPrice });

      console.log("Purchase request transaction hash:", tx.hash);

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      console.log(`Gas used for purchase request: ${receipt?.gasUsed}`);

      // Check request status
      const [isPending, isApproved, timestamp] = await infoTradeContract.getPurchaseRequestStatus(
        infoId,
        signers.bob.address
      );

      expect(isPending).to.be.true;
      expect(isApproved).to.be.false;

      console.log("Purchase request created successfully!");
      console.log(`Request timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`);

      // Check pending requests for seller
      const pendingRequests = await infoTradeContract.connect(signers.alice).getPendingRequests(infoId);
      expect(pendingRequests.length).to.eq(1);
      expect(pendingRequests[0]).to.eq(signers.bob.address);

      console.log("Pending requests:", pendingRequests);
    });

    it("should handle access granting on Sepolia", async function () {
      // First create a purchase request
      await infoTradeContract.connect(signers.bob).requestPurchase(infoId, { value: testPrice });

      console.log("Granting access to buyer...");

      const aliceBalanceBefore = await ethers.provider.getBalance(signers.alice.address);
      console.log(`Alice's balance before granting access: ${ethers.formatEther(aliceBalanceBefore)} ETH`);

      const tx = await infoTradeContract
        .connect(signers.alice)
        .grantAccess(infoId, signers.bob.address);

      console.log("Grant access transaction hash:", tx.hash);

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      console.log(`Gas used for granting access: ${receipt?.gasUsed}`);

      // Check final status
      const [isPending, isApproved] = await infoTradeContract.getPurchaseRequestStatus(
        infoId,
        signers.bob.address
      );

      expect(isPending).to.be.false;
      expect(isApproved).to.be.true;

      // Check platform balance
      const [, platformBalance] = await infoTradeContract.getPlatformStats();
      const expectedFee = (testPrice * 2n) / 100n;
      expect(platformBalance).to.eq(expectedFee);

      console.log("Access granted successfully!");
      console.log(`Platform fee collected: ${ethers.formatEther(platformBalance)} ETH`);

      const aliceBalanceAfter = await ethers.provider.getBalance(signers.alice.address);
      console.log(`Alice's balance after: ${ethers.formatEther(aliceBalanceAfter)} ETH`);
    });
  });

  describe("Information Access on Sepolia", function () {
    let infoId: bigint;

    beforeEach(async function () {
      if (fhevm.isMock) {
        this.skip();
        return;
      }

      // Setup: Upload info, request purchase, grant access
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.alice)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      infoId = 1n;

      await infoTradeContract.connect(signers.bob).requestPurchase(infoId, { value: testPrice });
      await infoTradeContract.connect(signers.alice).grantAccess(infoId, signers.bob.address);
    });

    it("should retrieve encrypted information on Sepolia", async function () {
      console.log("Retrieving encrypted information...");

      // Bob should be able to access the encrypted info
      const encryptedInfo = await infoTradeContract.connect(signers.bob).getEncryptedInfo(infoId);
      expect(encryptedInfo).to.not.eq(ethers.ZeroHash);

      console.log(`Retrieved encrypted info handle: ${encryptedInfo}`);

      // Alice (seller) should also be able to access
      const encryptedInfoSeller = await infoTradeContract.connect(signers.alice).getEncryptedInfo(infoId);
      expect(encryptedInfoSeller).to.eq(encryptedInfo);

      console.log("Information access verified on Sepolia!");

      // Note: Actual decryption would require user keys and more complex setup
      console.log("Note: Actual decryption requires user private keys and relayer setup");
    });
  });

  describe("Platform Management on Sepolia", function () {
    it("should handle platform fee withdrawal on Sepolia", async function () {
      // Setup a complete transaction to generate fees
      const encodedAddress = await infoEncoderContract.encodeString(testMessage);
      const encryptedInput = await fhevm
        .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
        .addAddress(encodedAddress)
        .encrypt();

      await infoTradeContract
        .connect(signers.alice)
        .uploadInfo(encryptedInput.handles[0], encryptedInput.inputProof, testPrice);

      await infoTradeContract.connect(signers.bob).requestPurchase(1n, { value: testPrice });
      await infoTradeContract.connect(signers.alice).grantAccess(1n, signers.bob.address);

      console.log("Withdrawing platform fees...");

      const deployerBalanceBefore = await ethers.provider.getBalance(signers.deployer.address);
      const [, platformBalanceBefore] = await infoTradeContract.getPlatformStats();

      console.log(`Platform balance before withdrawal: ${ethers.formatEther(platformBalanceBefore)} ETH`);

      const tx = await infoTradeContract.connect(signers.deployer).withdrawPlatformFees();
      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      console.log(`Gas used for fee withdrawal: ${receipt?.gasUsed}`);

      const [, platformBalanceAfter] = await infoTradeContract.getPlatformStats();
      expect(platformBalanceAfter).to.eq(0n);

      console.log("Platform fees withdrawn successfully!");
      console.log(`Withdrawn amount: ${ethers.formatEther(platformBalanceBefore)} ETH`);
    });
  });

  after(async function () {
    if (!fhevm.isMock) {
      console.log("\n=== Sepolia Test Summary ===");
      console.log(`InfoTrade contract: ${infoTradeContractAddress}`);
      console.log(`InfoEncoder contract: ${await infoEncoderContract?.getAddress()}`);
      console.log("All Sepolia integration tests completed!");
      console.log("===========================");
    }
  });
});