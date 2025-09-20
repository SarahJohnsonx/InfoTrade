import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying InfoTrade contracts with the account:", deployer);

  // Deploy StringAddressUtils library first
  const deployedStringUtils = await deploy("StringAddressUtils", {
    from: deployer,
    log: true,
  });

  console.log(`StringAddressUtils library deployed at: ${deployedStringUtils.address}`);

  // Deploy InfoEncoder contract
  const deployedInfoEncoder = await deploy("InfoEncoder", {
    from: deployer,
    log: true,
    libraries: {
      StringAddressUtils: deployedStringUtils.address,
    },
  });

  console.log(`InfoEncoder contract deployed at: ${deployedInfoEncoder.address}`);

  // Deploy main InfoTrade contract
  const deployedInfoTrade = await deploy("InfoTrade", {
    from: deployer,
    log: true,
  });

  console.log(`InfoTrade contract deployed at: ${deployedInfoTrade.address}`);

  // Log deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log(`StringAddressUtils Library: ${deployedStringUtils.address}`);
  console.log(`InfoEncoder Contract: ${deployedInfoEncoder.address}`);
  console.log(`InfoTrade Contract: ${deployedInfoTrade.address}`);
  console.log("========================\n");

  return {
    stringUtils: deployedStringUtils.address,
    infoEncoder: deployedInfoEncoder.address,
    infoTrade: deployedInfoTrade.address,
  };
};

export default func;
func.id = "deploy_infotrade"; // id required to prevent reexecution
func.tags = ["InfoTrade", "StringAddressUtils", "InfoEncoder"];
func.dependencies = []; // No dependencies on other deploy scripts