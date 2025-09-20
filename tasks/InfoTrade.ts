// import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the InfoTrade contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the InfoTrade contract
 *
 *   npx hardhat --network localhost infotrade:address
 *   npx hardhat --network localhost infotrade:create --title "My Secret" --info "Secret trading algorithm" --price 1000000
 *   npx hardhat --network localhost infotrade:list
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the InfoTrade contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the InfoTrade contract
 *
 *   npx hardhat --network sepolia infotrade:address
 *   npx hardhat --network sepolia infotrade:create --title "My Secret" --info "Secret trading algorithm" --price 1000000
 *   npx hardhat --network sepolia infotrade:list
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost infotrade:address
 *   - npx hardhat --network sepolia infotrade:address
 */
task("infotrade:address", "Prints the InfoTrade address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const infoTrade = await deployments.get("InfoTrade");

  console.log("InfoTrade address is " + infoTrade.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost infotrade:create --title "Secret Algorithm" --info "My trading algorithm" --price 1000000
 *   - npx hardhat --network sepolia infotrade:create --title "Secret Algorithm" --info "My trading algorithm" --price 1000000
 */
task("infotrade:create", "Creates a new info item")
  .addOptionalParam("address", "Optionally specify the InfoTrade contract address")
  .addParam("title", "The title of the info")
  .addParam("info", "The content of the info")
  .addParam("price", "The price of the info")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const price = parseInt(taskArguments.price);
    if (!Number.isInteger(price) || price <= 0) {
      throw new Error(`Argument --price must be a positive integer`);
    }

    await fhevm.initializeCLIApi();

    const infoTradeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("InfoTrade");
    console.log(`InfoTrade: ${infoTradeDeployment.address}`);

    const signers = await ethers.getSigners();

    const infoTradeContract = await ethers.getContractAt("InfoTrade", infoTradeDeployment.address);

    // Encrypt the owner address and price
    const encryptedInput = await fhevm
      .createEncryptedInput(infoTradeDeployment.address, signers[0].address)
      .addAddress(signers[0].address)
      .add64(price)
      .encrypt();

    const tx = await infoTradeContract
      .connect(signers[0])
      .createInfo(
        taskArguments.title,
        taskArguments.info,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const totalCount = await infoTradeContract.getTotalInfoCount();
    console.log(`InfoTrade createInfo("${taskArguments.title}") succeeded! Total info count: ${totalCount}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost infotrade:purchase --id 1
 *   - npx hardhat --network sepolia infotrade:purchase --id 1
 */
task("infotrade:purchase", "Purchases an info item")
  .addOptionalParam("address", "Optionally specify the InfoTrade contract address")
  .addParam("id", "The ID of the info to purchase")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const infoId = parseInt(taskArguments.id);
    if (!Number.isInteger(infoId) || infoId <= 0) {
      throw new Error(`Argument --id must be a positive integer`);
    }

    await fhevm.initializeCLIApi();

    const infoTradeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("InfoTrade");
    console.log(`InfoTrade: ${infoTradeDeployment.address}`);

    const signers = await ethers.getSigners();

    const infoTradeContract = await ethers.getContractAt("InfoTrade", infoTradeDeployment.address);

    const tx = await infoTradeContract
      .connect(signers[1]) // Use second signer as buyer
      .purchaseInfo(infoId);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`InfoTrade purchaseInfo(${infoId}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost infotrade:grant --id 1 --buyer 0x...
 *   - npx hardhat --network sepolia infotrade:grant --id 1 --buyer 0x...
 */
task("infotrade:grant", "Grants access to a purchased info item")
  .addOptionalParam("address", "Optionally specify the InfoTrade contract address")
  .addParam("id", "The ID of the info")
  .addParam("buyer", "The address of the buyer")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const infoId = parseInt(taskArguments.id);
    if (!Number.isInteger(infoId) || infoId <= 0) {
      throw new Error(`Argument --id must be a positive integer`);
    }

    await fhevm.initializeCLIApi();

    const infoTradeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("InfoTrade");
    console.log(`InfoTrade: ${infoTradeDeployment.address}`);

    const signers = await ethers.getSigners();

    const infoTradeContract = await ethers.getContractAt("InfoTrade", infoTradeDeployment.address);

    const tx = await infoTradeContract
      .connect(signers[0]) // Owner grants access
      .grantAccess(infoId, taskArguments.buyer);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`InfoTrade grantAccess(${infoId}, ${taskArguments.buyer}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost infotrade:list
 *   - npx hardhat --network sepolia infotrade:list
 */
task("infotrade:list", "Lists all info items")
  .addOptionalParam("address", "Optionally specify the InfoTrade contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const infoTradeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("InfoTrade");
    console.log(`InfoTrade: ${infoTradeDeployment.address}`);

    const signers = await ethers.getSigners();

    const infoTradeContract = await ethers.getContractAt("InfoTrade", infoTradeDeployment.address);

    const totalCount = await infoTradeContract.getTotalInfoCount();
    console.log(`Total info items: ${totalCount}`);

    for (let i = 1; i <= totalCount; i++) {
      try {
        const basicDetails = await infoTradeContract
          .connect(signers[0])
          .getInfoBasicDetails(i);

        console.log(`\nInfo ID: ${i}`);
        console.log(`Title: ${basicDetails.title}`);
        console.log(`Owner: ${basicDetails.owner}`);
        console.log(`Active: ${basicDetails.isActive}`);
        console.log(`Created: ${new Date(Number(basicDetails.createdAt) * 1000).toISOString()}`);
        console.log(`Has Access: ${basicDetails.hasAccess}`);
        console.log(`Has Purchased: ${basicDetails.hasPurchased}`);
      } catch (error) {
        console.log(`Error getting details for info ${i}:`, error);
      }
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost infotrade:content --id 1
 *   - npx hardhat --network sepolia infotrade:content --id 1
 */
task("infotrade:content", "Gets the content of an info item (requires access)")
  .addOptionalParam("address", "Optionally specify the InfoTrade contract address")
  .addParam("id", "The ID of the info")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const infoId = parseInt(taskArguments.id);
    if (!Number.isInteger(infoId) || infoId <= 0) {
      throw new Error(`Argument --id must be a positive integer`);
    }

    const infoTradeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("InfoTrade");
    console.log(`InfoTrade: ${infoTradeDeployment.address}`);

    const signers = await ethers.getSigners();

    const infoTradeContract = await ethers.getContractAt("InfoTrade", infoTradeDeployment.address);

    try {
      const content = await infoTradeContract
        .connect(signers[0])
        .getInfoContent(infoId);

      console.log(`Content of info ${infoId}:`);
      console.log(content);
    } catch (error) {
      console.log(`Error: You don't have access to this info or it doesn't exist.`);
    }
  });