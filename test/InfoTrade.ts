import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { InfoTrade, InfoTrade__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("InfoTrade")) as InfoTrade__factory;
  const infoTradeContract = (await factory.deploy()) as InfoTrade;
  const infoTradeContractAddress = await infoTradeContract.getAddress();

  return { infoTradeContract, infoTradeContractAddress };
}

describe("InfoTrade", function () {
  let signers: Signers;
  let infoTradeContract: InfoTrade;
  let infoTradeContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      carol: ethSigners[3]
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ infoTradeContract, infoTradeContractAddress } = await deployFixture());
  });

  it("should deploy with initial state", async function () {
    const totalInfoCount = await infoTradeContract.getTotalInfoCount();
    expect(totalInfoCount).to.eq(0);

    const nextInfoId = await infoTradeContract.nextInfoId();
    expect(nextInfoId).to.eq(1);
  });

  it("should create info item successfully", async function () {
    const title = "Secret Algorithm";
    const info = "This is a secret trading algorithm";
    const price = 1000000;

    const encryptedInput = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(price)
      .encrypt();

    const tx = await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        title,
        info,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );

    await tx.wait();

    const totalInfoCount = await infoTradeContract.getTotalInfoCount();
    expect(totalInfoCount).to.eq(1);

    const basicDetails = await infoTradeContract
      .connect(signers.alice)
      .getInfoBasicDetails(1);

    expect(basicDetails.title).to.eq(title);
    expect(basicDetails.owner).to.eq(signers.alice.address);
    expect(basicDetails.isActive).to.eq(true);
    expect(basicDetails.hasAccess).to.eq(true);
    expect(basicDetails.hasPurchased).to.eq(false);

    const content = await infoTradeContract
      .connect(signers.alice)
      .getInfoContent(1);
    expect(content).to.eq(info);
  });

  it("should allow purchasing info", async function () {
    const title = "Market Insights";
    const info = "Confidential market analysis";
    const price = 500000;

    const encryptedInput = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(price)
      .encrypt();

    await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        title,
        info,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );

    const tx = await infoTradeContract
      .connect(signers.bob)
      .purchaseInfo(1);

    await tx.wait();

    const basicDetails = await infoTradeContract
      .connect(signers.bob)
      .getInfoBasicDetails(1);

    expect(basicDetails.hasPurchased).to.eq(true);
    expect(basicDetails.hasAccess).to.eq(false);

    const hasPurchased = await infoTradeContract.hasUserPurchased(1, signers.bob.address);
    expect(hasPurchased).to.eq(true);

    const hasAccess = await infoTradeContract.hasUserAccess(1, signers.bob.address);
    expect(hasAccess).to.eq(false);
  });

  it("should grant access after purchase", async function () {
    const title = "Trading Secrets";
    const info = "Advanced trading strategies";
    const price = 750000;

    const encryptedInput = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(price)
      .encrypt();

    await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        title,
        info,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );

    await infoTradeContract
      .connect(signers.bob)
      .purchaseInfo(1);

    const tx = await infoTradeContract
      .connect(signers.alice)
      .grantAccess(1, signers.bob.address);

    await tx.wait();

    const hasAccess = await infoTradeContract.hasUserAccess(1, signers.bob.address);
    expect(hasAccess).to.eq(true);

    const content = await infoTradeContract
      .connect(signers.bob)
      .getInfoContent(1);
    expect(content).to.eq(info);
  });

  it("should update price by owner", async function () {
    const title = "Investment Tips";
    const info = "Expert investment advice";
    const initialPrice = 300000;
    const newPrice = 400000;

    const encryptedInput = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(initialPrice)
      .encrypt();

    await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        title,
        info,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );

    const newPriceInput = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .add64(newPrice)
      .encrypt();

    const tx = await infoTradeContract
      .connect(signers.alice)
      .updatePrice(1, newPriceInput.handles[0], newPriceInput.inputProof);

    await tx.wait();

    const encryptedPrice = await infoTradeContract.getEncryptedPrice(1);
    const decryptedPrice = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedPrice,
      infoTradeContractAddress,
      signers.alice,
    );

    expect(decryptedPrice).to.eq(newPrice);
  });

  it("should deactivate info by owner", async function () {
    const title = "Crypto Insights";
    const info = "Cryptocurrency market analysis";
    const price = 200000;

    const encryptedInput = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(price)
      .encrypt();

    await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        title,
        info,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );

    const tx = await infoTradeContract
      .connect(signers.alice)
      .deactivateInfo(1);

    await tx.wait();

    const basicDetails = await infoTradeContract
      .connect(signers.alice)
      .getInfoBasicDetails(1);

    expect(basicDetails.isActive).to.eq(false);
  });

  it("should not allow purchasing own info", async function () {
    const title = "My Secret";
    const info = "Personal trading secret";
    const price = 100000;

    const encryptedInput = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(price)
      .encrypt();

    await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        title,
        info,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );

    await expect(
      infoTradeContract.connect(signers.alice).purchaseInfo(1)
    ).to.be.revertedWith("Cannot purchase your own info");
  });

  it("should not allow purchasing inactive info", async function () {
    const title = "Disabled Secret";
    const info = "This will be disabled";
    const price = 150000;

    const encryptedInput = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(price)
      .encrypt();

    await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        title,
        info,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );

    await infoTradeContract
      .connect(signers.alice)
      .deactivateInfo(1);

    await expect(
      infoTradeContract.connect(signers.bob).purchaseInfo(1)
    ).to.be.revertedWith("Info is not active");
  });

  it("should not allow duplicate purchases", async function () {
    const title = "Unique Secret";
    const info = "Can only be purchased once";
    const price = 250000;

    const encryptedInput = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(price)
      .encrypt();

    await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        title,
        info,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );

    await infoTradeContract
      .connect(signers.bob)
      .purchaseInfo(1);

    await expect(
      infoTradeContract.connect(signers.bob).purchaseInfo(1)
    ).to.be.revertedWith("Already purchased");
  });

  it("should track user info items and purchases", async function () {
    const price = 100000;

    const encryptedInput1 = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(price)
      .encrypt();

    await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        "Alice Info 1",
        "Alice's first info",
        encryptedInput1.handles[0],
        encryptedInput1.handles[1],
        encryptedInput1.inputProof
      );

    const encryptedInput2 = await fhevm
      .createEncryptedInput(infoTradeContractAddress, signers.alice.address)
      .addAddress(signers.alice.address)
      .add64(price)
      .encrypt();

    await infoTradeContract
      .connect(signers.alice)
      .createInfo(
        "Alice Info 2",
        "Alice's second info",
        encryptedInput2.handles[0],
        encryptedInput2.handles[1],
        encryptedInput2.inputProof
      );

    await infoTradeContract
      .connect(signers.bob)
      .purchaseInfo(1);

    await infoTradeContract
      .connect(signers.bob)
      .purchaseInfo(2);

    const aliceInfoItems = await infoTradeContract.getUserInfoItems(signers.alice.address);
    expect(aliceInfoItems.length).to.eq(2);
    expect(aliceInfoItems[0]).to.eq(1);
    expect(aliceInfoItems[1]).to.eq(2);

    const bobPurchases = await infoTradeContract.getUserPurchases(signers.bob.address);
    expect(bobPurchases.length).to.eq(2);
    expect(bobPurchases[0]).to.eq(1);
    expect(bobPurchases[1]).to.eq(2);
  });
});