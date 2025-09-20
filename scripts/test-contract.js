const { ethers } = require("hardhat");

async function main() {
  // Get contract
  const contractFactory = await ethers.getContractFactory("InfoTrade");
  const contract = contractFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

  console.log("🚀 Testing InfoTrade contract...");
  console.log("Contract address:", await contract.getAddress());

  // Get signers
  const [signer1, signer2] = await ethers.getSigners();
  console.log("Signer 1:", signer1.address);
  console.log("Signer 2:", signer2.address);

  // Test basic info retrieval
  console.log("\n📋 Testing basic functions...");

  try {
    const allInfos = await contract.getAllInfos();
    console.log("All info IDs:", allInfos.toString());

    const userInfos = await contract.getUserInfoItems(signer1.address);
    console.log("User info items:", userInfos.toString());

    const pendingRequests = await contract.getPendingRequests(signer1.address);
    console.log("Pending requests:", pendingRequests.toString());

    const ACCESS_PRICE = await contract.ACCESS_PRICE();
    console.log("Access price:", ethers.formatEther(ACCESS_PRICE), "ETH");

  } catch (error) {
    console.error("Error testing basic functions:", error.message);
  }

  console.log("\n✅ Basic contract interaction test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });