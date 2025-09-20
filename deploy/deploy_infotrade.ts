import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying InfoTrade contract with the account:", deployer);

  // Deploy main InfoTrade contract
  const deployedInfoTrade = await deploy("InfoTrade", {
    from: deployer,
    log: true,
  });

  console.log(`InfoTrade contract deployed at: ${deployedInfoTrade.address}`);

  // Log deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log(`InfoTrade Contract: ${deployedInfoTrade.address}`);
  console.log("========================\n");

  return {
    infoTrade: deployedInfoTrade.address,
  };
};

export default func;
func.id = "deploy_infotrade"; // id required to prevent reexecution
func.tags = ["InfoTrade"];
func.dependencies = []; // No dependencies on other deploy scripts