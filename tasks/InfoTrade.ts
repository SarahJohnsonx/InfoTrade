import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("info-trade:upload", "Upload encrypted information")
  .addParam("contract", "The InfoTrade contract address")
  .addParam("encoder", "The InfoEncoder contract address")
  .addParam("message", "The message to encrypt and upload")
  .addParam("price", "The price in ETH")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, fhevm } = hre;
    const [signer] = await ethers.getSigners();

    console.log("Uploading encrypted information...");
    console.log(`Contract: ${taskArgs.contract}`);
    console.log(`Message: "${taskArgs.message}"`);
    console.log(`Price: ${taskArgs.price} ETH`);
    console.log(`Signer: ${signer.address}`);

    // Get contract instances
    const infoTrade = await ethers.getContractAt("InfoTrade", taskArgs.contract);
    const infoEncoder = await ethers.getContractAt("InfoEncoder", taskArgs.encoder);

    // Encode message to address
    const encodedAddress = await infoEncoder.encodeString(taskArgs.message);
    console.log(`Encoded address: ${encodedAddress}`);

    // Create encrypted input
    const encryptedInput = await fhevm
      .createEncryptedInput(taskArgs.contract, signer.address)
      .addAddress(encodedAddress)
      .encrypt();

    console.log("Created encrypted input");

    // Upload information
    const priceWei = ethers.parseEther(taskArgs.price);
    const tx = await infoTrade.uploadInfo(
      encryptedInput.handles[0],
      encryptedInput.inputProof,
      priceWei
    );

    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Gas used: ${receipt?.gasUsed}`);

    // Get the info ID from events
    const events = receipt?.logs || [];
    console.log(`Upload completed! Check events for Info ID`);

    // Get platform stats
    const [nextInfoId] = await infoTrade.getPlatformStats();
    console.log(`Next Info ID: ${nextInfoId}`);
  });

task("info-trade:request", "Request to purchase information")
  .addParam("contract", "The InfoTrade contract address")
  .addParam("id", "The information ID")
  .addParam("value", "The payment value in ETH")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    console.log("Requesting to purchase information...");
    console.log(`Contract: ${taskArgs.contract}`);
    console.log(`Info ID: ${taskArgs.id}`);
    console.log(`Payment: ${taskArgs.value} ETH`);
    console.log(`Buyer: ${signer.address}`);

    const infoTrade = await ethers.getContractAt("InfoTrade", taskArgs.contract);

    // Get info details
    const [seller, price, isActive] = await infoTrade.getInfoBasics(taskArgs.id);
    console.log(`Info details:`);
    console.log(`  Seller: ${seller}`);
    console.log(`  Price: ${ethers.formatEther(price)} ETH`);
    console.log(`  Active: ${isActive}`);

    const valueWei = ethers.parseEther(taskArgs.value);
    const tx = await infoTrade.requestPurchase(taskArgs.id, { value: valueWei });

    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Gas used: ${receipt?.gasUsed}`);
    console.log("Purchase request submitted!");
  });

task("info-trade:grant", "Grant access to information")
  .addParam("contract", "The InfoTrade contract address")
  .addParam("id", "The information ID")
  .addParam("buyer", "The buyer address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    console.log("Granting access to information...");
    console.log(`Contract: ${taskArgs.contract}`);
    console.log(`Info ID: ${taskArgs.id}`);
    console.log(`Buyer: ${taskArgs.buyer}`);
    console.log(`Seller: ${signer.address}`);

    const infoTrade = await ethers.getContractAt("InfoTrade", taskArgs.contract);

    // Check request status
    const [isPending, isApproved] = await infoTrade.getPurchaseRequestStatus(
      taskArgs.id,
      taskArgs.buyer
    );
    console.log(`Request status - Pending: ${isPending}, Approved: ${isApproved}`);

    const tx = await infoTrade.grantAccess(taskArgs.id, taskArgs.buyer);

    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Gas used: ${receipt?.gasUsed}`);
    console.log("Access granted successfully!");

    // Check platform stats
    const [, platformBalance] = await infoTrade.getPlatformStats();
    console.log(`Platform balance: ${ethers.formatEther(platformBalance)} ETH`);
  });

task("info-trade:deny", "Deny access to information")
  .addParam("contract", "The InfoTrade contract address")
  .addParam("id", "The information ID")
  .addParam("buyer", "The buyer address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    console.log("Denying access to information...");
    console.log(`Contract: ${taskArgs.contract}`);
    console.log(`Info ID: ${taskArgs.id}`);
    console.log(`Buyer: ${taskArgs.buyer}`);
    console.log(`Seller: ${signer.address}`);

    const infoTrade = await ethers.getContractAt("InfoTrade", taskArgs.contract);

    const tx = await infoTrade.denyAccess(taskArgs.id, taskArgs.buyer);

    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Gas used: ${receipt?.gasUsed}`);
    console.log("Access denied and payment refunded!");
  });

task("info-trade:get-pending", "Get pending purchase requests")
  .addParam("contract", "The InfoTrade contract address")
  .addParam("id", "The information ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    console.log("Getting pending purchase requests...");
    console.log(`Contract: ${taskArgs.contract}`);
    console.log(`Info ID: ${taskArgs.id}`);
    console.log(`Seller: ${signer.address}`);

    const infoTrade = await ethers.getContractAt("InfoTrade", taskArgs.contract);

    const pendingRequests = await infoTrade.getPendingRequests(taskArgs.id);
    console.log(`Pending requests (${pendingRequests.length}):`);
    
    for (let i = 0; i < pendingRequests.length; i++) {
      console.log(`  ${i + 1}. ${pendingRequests[i]}`);
      
      // Get request details
      const [isPending, isApproved, timestamp] = await infoTrade.getPurchaseRequestStatus(
        taskArgs.id,
        pendingRequests[i]
      );
      console.log(`     Pending: ${isPending}, Approved: ${isApproved}`);
      console.log(`     Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`);
    }
  });

task("info-trade:get-info", "Get information details")
  .addParam("contract", "The InfoTrade contract address")
  .addParam("id", "The information ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    console.log("Getting information details...");
    console.log(`Contract: ${taskArgs.contract}`);
    console.log(`Info ID: ${taskArgs.id}`);

    const infoTrade = await ethers.getContractAt("InfoTrade", taskArgs.contract);

    const [seller, price, isActive, createdAt] = await infoTrade.getInfoBasics(taskArgs.id);
    
    console.log("Information details:");
    console.log(`  ID: ${taskArgs.id}`);
    console.log(`  Seller: ${seller}`);
    console.log(`  Price: ${ethers.formatEther(price)} ETH`);
    console.log(`  Active: ${isActive}`);
    console.log(`  Created: ${new Date(Number(createdAt) * 1000).toISOString()}`);
  });

task("info-trade:encode", "Encode a string to address")
  .addParam("encoder", "The InfoEncoder contract address")
  .addParam("message", "The message to encode")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    console.log("Encoding string to address...");
    console.log(`Contract: ${taskArgs.encoder}`);
    console.log(`Message: "${taskArgs.message}"`);

    const infoEncoder = await ethers.getContractAt("InfoEncoder", taskArgs.encoder);

    const encodedAddress = await infoEncoder.encodeString(taskArgs.message);
    console.log(`Encoded address: ${encodedAddress}`);

    // Verify encoding
    const isValid = await infoEncoder.verifyEncoding(taskArgs.message, encodedAddress);
    console.log(`Verification: ${isValid ? "VALID" : "INVALID"}`);
  });

task("info-trade:platform-stats", "Get platform statistics")
  .addParam("contract", "The InfoTrade contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    console.log("Getting platform statistics...");
    console.log(`Contract: ${taskArgs.contract}`);

    const infoTrade = await ethers.getContractAt("InfoTrade", taskArgs.contract);

    const [nextInfoId, platformBalance] = await infoTrade.getPlatformStats();
    const owner = await infoTrade.owner();

    console.log("Platform statistics:");
    console.log(`  Owner: ${owner}`);
    console.log(`  Next Info ID: ${nextInfoId}`);
    console.log(`  Platform Balance: ${ethers.formatEther(platformBalance)} ETH`);
    console.log(`  Total Items: ${Number(nextInfoId) - 1}`);
  });