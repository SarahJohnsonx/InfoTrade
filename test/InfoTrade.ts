import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { InfoTrade, InfoTrade__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
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
      charlie: ethSigners[3]
    };
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    infoTradeContract = deployment.infoTradeContract;
    infoTradeContractAddress = deployment.infoTradeContractAddress;
  });

  describe("Store Info", function () {
    it("should store info with encrypted address", async function () {
      const input = fhevm.createEncryptedInput(infoTradeContractAddress, signers.alice.address);
      input.addAddress(signers.alice.address);
      const encryptedInput = await input.encrypt();

      const tx = await infoTradeContract
        .connect(signers.alice)
        .storeInfo(
          "My Secret Info",
          "This is confidential information",
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );

      await expect(tx)
        .to.emit(infoTradeContract, "InfoStored")
        .withArgs(1, signers.alice.address, "My Secret Info", ethers.parseEther("0.001"));

      const info = await infoTradeContract.getInfo(1);
      expect(info.name).to.equal("My Secret Info");
      expect(info.info).to.equal("This is confidential information");
      expect(info.owner).to.equal(signers.alice.address);
      expect(info.price).to.equal(ethers.parseEther("0.001"));
    });

    it("should fail if name is empty", async function () {
      const input = fhevm.createEncryptedInput(infoTradeContractAddress, signers.alice.address);
      input.addAddress(signers.alice.address);
      const encryptedInput = await input.encrypt();

      await expect(
        infoTradeContract
          .connect(signers.alice)
          .storeInfo(
            "",
            "This is confidential information",
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("should fail if info is empty", async function () {
      const input = fhevm.createEncryptedInput(infoTradeContractAddress, signers.alice.address);
      input.addAddress(signers.alice.address);
      const encryptedInput = await input.encrypt();

      await expect(
        infoTradeContract
          .connect(signers.alice)
          .storeInfo(
            "My Secret Info",
            "",
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.be.revertedWith("Info cannot be empty");
    });
  });

  describe("Request Access", function () {
    beforeEach(async function () {
      const input = fhevm.createEncryptedInput(infoTradeContractAddress, signers.alice.address);
      input.addAddress(signers.alice.address);
      const encryptedInput = await input.encrypt();

      await infoTradeContract
        .connect(signers.alice)
        .storeInfo(
          "Alice's Secret",
          "Confidential data",
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );
    });

    it("should allow requesting access with correct payment", async function () {
      const tx = await infoTradeContract
        .connect(signers.bob)
        .requestAccess(1, { value: ethers.parseEther("0.001") });

      await expect(tx)
        .to.emit(infoTradeContract, "AccessRequested")
        .withArgs(1, 1, signers.bob.address, ethers.parseEther("0.001"));

      const request = await infoTradeContract.accessRequests(1);
      expect(request.infoId).to.equal(1);
      expect(request.requester).to.equal(signers.bob.address);
      expect(request.amount).to.equal(ethers.parseEther("0.001"));
      expect(request.isPending).to.be.true;
      expect(request.isApproved).to.be.false;
    });

    it("should fail if payment is insufficient", async function () {
      await expect(
        infoTradeContract
          .connect(signers.bob)
          .requestAccess(1, { value: ethers.parseEther("0.0005") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("should fail if info does not exist", async function () {
      await expect(
        infoTradeContract
          .connect(signers.bob)
          .requestAccess(999, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("Info does not exist");
    });

    it("should fail if owner tries to request their own info", async function () {
      await expect(
        infoTradeContract
          .connect(signers.alice)
          .requestAccess(1, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("Cannot request access to own info");
    });
  });

  describe("Approve Access", function () {
    beforeEach(async function () {
      const input = fhevm.createEncryptedInput(infoTradeContractAddress, signers.alice.address);
      input.addAddress(signers.alice.address);
      const encryptedInput = await input.encrypt();

      await infoTradeContract
        .connect(signers.alice)
        .storeInfo(
          "Alice's Secret",
          "Confidential data",
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );

      await infoTradeContract
        .connect(signers.bob)
        .requestAccess(1, { value: ethers.parseEther("0.001") });
    });

    it("should allow owner to approve access", async function () {
      const aliceBalanceBefore = await ethers.provider.getBalance(signers.alice.address);

      const tx = await infoTradeContract
        .connect(signers.alice)
        .approveAccess(1);

      await expect(tx)
        .to.emit(infoTradeContract, "AccessApproved")
        .withArgs(1, 1, signers.bob.address);

      const request = await infoTradeContract.accessRequests(1);
      expect(request.isPending).to.be.false;
      expect(request.isApproved).to.be.true;

      const hasAccess = await infoTradeContract.hasAccessToInfo(1, signers.bob.address);
      expect(hasAccess).to.be.true;

      const aliceBalanceAfter = await ethers.provider.getBalance(signers.alice.address);
      expect(aliceBalanceAfter).to.be.greaterThan(aliceBalanceBefore);
    });

    it("should fail if not the owner", async function () {
      await expect(
        infoTradeContract
          .connect(signers.charlie)
          .approveAccess(1)
      ).to.be.revertedWith("Not authorized to approve");
    });

    it("should fail if request does not exist", async function () {
      await expect(
        infoTradeContract
          .connect(signers.alice)
          .approveAccess(999)
      ).to.be.revertedWith("Request does not exist");
    });
  });

  describe("Deny Access", function () {
    beforeEach(async function () {
      const input = fhevm.createEncryptedInput(infoTradeContractAddress, signers.alice.address);
      input.addAddress(signers.alice.address);
      const encryptedInput = await input.encrypt();

      await infoTradeContract
        .connect(signers.alice)
        .storeInfo(
          "Alice's Secret",
          "Confidential data",
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );

      await infoTradeContract
        .connect(signers.bob)
        .requestAccess(1, { value: ethers.parseEther("0.001") });
    });

    it("should allow owner to deny access and refund payment", async function () {
      const bobBalanceBefore = await ethers.provider.getBalance(signers.bob.address);

      const tx = await infoTradeContract
        .connect(signers.alice)
        .denyAccess(1);

      await expect(tx)
        .to.emit(infoTradeContract, "AccessDenied")
        .withArgs(1, 1, signers.bob.address);

      const request = await infoTradeContract.accessRequests(1);
      expect(request.isPending).to.be.false;
      expect(request.isApproved).to.be.false;

      const hasAccess = await infoTradeContract.hasAccessToInfo(1, signers.bob.address);
      expect(hasAccess).to.be.false;

      const bobBalanceAfter = await ethers.provider.getBalance(signers.bob.address);
      expect(bobBalanceAfter).to.be.greaterThan(bobBalanceBefore);
    });
  });


  describe("Access Control", function () {
    beforeEach(async function () {
      const input = fhevm.createEncryptedInput(infoTradeContractAddress, signers.alice.address);
      input.addAddress(signers.alice.address);
      const encryptedInput = await input.encrypt();

      await infoTradeContract
        .connect(signers.alice)
        .storeInfo(
          "Alice's Secret",
          "Confidential data",
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );

      await infoTradeContract
        .connect(signers.bob)
        .requestAccess(1, { value: ethers.parseEther("0.001") });

      await infoTradeContract
        .connect(signers.alice)
        .approveAccess(1);
    });

    it("should allow authorized user to get encrypted address", async function () {
      const encryptedAddress = await infoTradeContract
        .connect(signers.bob)
        .getEncryptedAddress(1);

      expect(encryptedAddress).to.not.be.undefined;
    });

    it("should allow owner to get encrypted address", async function () {
      const encryptedAddress = await infoTradeContract
        .connect(signers.alice)
        .getEncryptedAddress(1);

      expect(encryptedAddress).to.not.be.undefined;
    });

    it("should fail if unauthorized user tries to get encrypted address", async function () {
      await expect(
        infoTradeContract
          .connect(signers.charlie)
          .getEncryptedAddress(1)
      ).to.be.revertedWith("No access to encrypted address");
    });
  });

  describe("Utility Functions", function () {
    beforeEach(async function () {
      const input1 = fhevm.createEncryptedInput(infoTradeContractAddress, signers.alice.address);
      input1.addAddress(signers.alice.address);
      const encryptedInput1 = await input1.encrypt();

      const input2 = fhevm.createEncryptedInput(infoTradeContractAddress, signers.alice.address);
      input2.addAddress(signers.alice.address);
      const encryptedInput2 = await input2.encrypt();

      await infoTradeContract
        .connect(signers.alice)
        .storeInfo(
          "Alice's First Secret",
          "First confidential data",
          encryptedInput1.handles[0],
          encryptedInput1.inputProof
        );

      await infoTradeContract
        .connect(signers.alice)
        .storeInfo(
          "Alice's Second Secret",
          "Second confidential data",
          encryptedInput2.handles[0],
          encryptedInput2.inputProof
        );
    });

    it("should return user's info items", async function () {
      const userInfos = await infoTradeContract.getUserInfoItems(signers.alice.address);
      expect(userInfos.length).to.equal(2);
      expect(userInfos[0]).to.equal(1);
      expect(userInfos[1]).to.equal(2);
    });

    it("should return all infos", async function () {
      const allInfos = await infoTradeContract.getAllInfos();
      expect(allInfos.length).to.equal(2);
      expect(allInfos[0]).to.equal(1);
      expect(allInfos[1]).to.equal(2);
    });

    it("should return pending requests for owner using optimized function", async function () {
      await infoTradeContract
        .connect(signers.bob)
        .requestAccess(1, { value: ethers.parseEther("0.001") });

      await infoTradeContract
        .connect(signers.bob)
        .requestAccess(2, { value: ethers.parseEther("0.001") });

      const pendingRequests = await infoTradeContract.getPendingRequests(signers.alice.address);
      expect(pendingRequests.length).to.equal(2);
      expect(pendingRequests[0]).to.equal(1);
      expect(pendingRequests[1]).to.equal(2);
    });

    it("should return owner pending requests using new function", async function () {
      await infoTradeContract
        .connect(signers.bob)
        .requestAccess(1, { value: ethers.parseEther("0.001") });

      const ownerPendingRequests = await infoTradeContract.getOwnerPendingRequests(signers.alice.address);
      expect(ownerPendingRequests.length).to.equal(1);
      expect(ownerPendingRequests[0]).to.equal(1);
    });

    it("should remove from pending list when approved", async function () {
      await infoTradeContract
        .connect(signers.bob)
        .requestAccess(1, { value: ethers.parseEther("0.001") });

      let pendingRequests = await infoTradeContract.getOwnerPendingRequests(signers.alice.address);
      expect(pendingRequests.length).to.equal(1);

      await infoTradeContract
        .connect(signers.alice)
        .approveAccess(1);

      pendingRequests = await infoTradeContract.getOwnerPendingRequests(signers.alice.address);
      expect(pendingRequests.length).to.equal(0);
    });

    it("should remove from pending list when denied", async function () {
      await infoTradeContract
        .connect(signers.bob)
        .requestAccess(1, { value: ethers.parseEther("0.001") });

      let pendingRequests = await infoTradeContract.getOwnerPendingRequests(signers.alice.address);
      expect(pendingRequests.length).to.equal(1);

      await infoTradeContract
        .connect(signers.alice)
        .denyAccess(1);

      pendingRequests = await infoTradeContract.getOwnerPendingRequests(signers.alice.address);
      expect(pendingRequests.length).to.equal(0);
    });
  });
});