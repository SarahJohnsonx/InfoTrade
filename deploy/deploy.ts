import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedInfoTrade = await deploy("InfoTrade", {
    from: deployer,
    log: true,
  });

  console.log(`InfoTrade contract: `, deployedInfoTrade.address);
};
export default func;
func.id = "deploy_infotrade"; // id required to prevent reexecution
func.tags = ["InfoTrade"];
