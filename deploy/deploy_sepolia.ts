import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Only run on Sepolia network
  if (hre.network.name !== "sepolia") {
    console.log("This script is only for Sepolia network deployment");
    return;
  }

  console.log("Deploying InfoTrade contracts to Sepolia network...");
  console.log("Deployer address:", deployer);

  // Get deployer balance
  const deployerBalance = await hre.ethers.provider.getBalance(deployer);
  console.log(`Deployer balance: ${hre.ethers.formatEther(deployerBalance)} ETH`);

  if (deployerBalance < hre.ethers.parseEther("0.1")) {
    console.warn("Warning: Deployer balance is low. Consider adding more ETH.");
  }

  try {
    // Deploy StringAddressUtils library
    console.log("\nDeploying StringAddressUtils library...");
    const stringUtils = await deploy("StringAddressUtils", {
      from: deployer,
      log: true,
      gasLimit: 1000000,
    });

    // Deploy InfoEncoder contract
    console.log("\nDeploying InfoEncoder contract...");
    const infoEncoder = await deploy("InfoEncoder", {
      from: deployer,
      log: true,
      libraries: {
        StringAddressUtils: stringUtils.address,
      },
      gasLimit: 2000000,
    });

    // Deploy InfoTrade contract
    console.log("\nDeploying InfoTrade contract...");
    const infoTrade = await deploy("InfoTrade", {
      from: deployer,
      log: true,
      gasLimit: 5000000,
    });

    // Verification info
    console.log("\n=== Sepolia Deployment Complete ===");
    console.log(`StringAddressUtils: ${stringUtils.address}`);
    console.log(`InfoEncoder: ${infoEncoder.address}`);
    console.log(`InfoTrade: ${infoTrade.address}`);
    console.log("\nTo verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network sepolia ${stringUtils.address}`);
    console.log(`npx hardhat verify --network sepolia ${infoEncoder.address}`);
    console.log(`npx hardhat verify --network sepolia ${infoTrade.address}`);
    console.log("================================\n");

    // Save deployment addresses to file
    const fs = require("fs");
    const deploymentInfo = {
      network: "sepolia",
      timestamp: new Date().toISOString(),
      deployer: deployer,
      contracts: {
        StringAddressUtils: stringUtils.address,
        InfoEncoder: infoEncoder.address,
        InfoTrade: infoTrade.address,
      },
    };

    fs.writeFileSync(
      `./deployments/sepolia_deployment_${Date.now()}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );

    return deploymentInfo;
  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
};

export default func;
func.id = "deploy_sepolia_infotrade";
func.tags = ["Sepolia", "InfoTrade"];
func.skip = async (hre: HardhatRuntimeEnvironment) => {
  return hre.network.name !== "sepolia";
};