import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:store-info")
  .addParam("name", "The name of the info")
  .addParam("info", "The info content")
  .addParam("address", "The encrypted address")
  .setAction(async function (taskArguments: TaskArguments, { ethers, fhevm }) {
    const { name, info, address } = taskArguments;
    const signers = await ethers.getSigners();
    const contractFactory = await ethers.getContractFactory("InfoTrade");
    const contract = contractFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Default hardhat address

    const input = fhevm.createEncryptedInput(contract.target, signers[0].address);
    input.addAddress(address);
    const encryptedInput = await input.encrypt();

    const transaction = await contract.storeInfo(name, info, encryptedInput.handles[0], encryptedInput.inputProof);
    await transaction.wait();
    console.log(`Info stored with name: ${name}`);
  });

task("task:request-access")
  .addParam("infoid", "The ID of the info to request access to")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { infoid } = taskArguments;
    const signers = await ethers.getSigners();
    const contractFactory = await ethers.getContractFactory("InfoTrade");
    const contract = contractFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

    const transaction = await contract.requestAccess(infoid, { value: ethers.parseEther("0.001") });
    await transaction.wait();
    console.log(`Access requested for info ID: ${infoid}`);
  });

task("task:approve-access")
  .addParam("requestid", "The ID of the request to approve")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { requestid } = taskArguments;
    const signers = await ethers.getSigners();
    const contractFactory = await ethers.getContractFactory("InfoTrade");
    const contract = contractFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

    const transaction = await contract.approveAccess(requestid);
    await transaction.wait();
    console.log(`Access approved for request ID: ${requestid}`);
  });

task("task:get-info")
  .addParam("infoid", "The ID of the info to get")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { infoid } = taskArguments;
    const signers = await ethers.getSigners();
    const contractFactory = await ethers.getContractFactory("InfoTrade");
    const contract = contractFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

    const info = await contract.getInfo(infoid);
    console.log(`Info ID: ${info.id}`);
    console.log(`Name: ${info.name}`);
    console.log(`Info: ${info.info}`);
    console.log(`Owner: ${info.owner}`);
    console.log(`Price: ${ethers.formatEther(info.price)} ETH`);
  });

task("task:get-all-active-infos")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers = await ethers.getSigners();
    const contractFactory = await ethers.getContractFactory("InfoTrade");
    const contract = contractFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

    const allInfos = await contract.getAllInfos();
    console.log(`All info IDs: ${allInfos.join(", ")}`);
  });

task("task:get-user-infos")
  .addParam("user", "The user address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { user } = taskArguments;
    const signers = await ethers.getSigners();
    const contractFactory = await ethers.getContractFactory("InfoTrade");
    const contract = contractFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

    const userInfos = await contract.getUserInfoItems(user);
    console.log(`User info IDs: ${userInfos.join(", ")}`);
  });