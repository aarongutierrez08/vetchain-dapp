import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESSES, ABIS, SEPOLIA_CHAIN_ID } from "../constants";
import { UserRole } from "../types";

declare global {
  interface Window {
    ethereum: any;
  }
}

export const useBlockchain = () => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Contracts
  const [nftContract, setNftContract] = useState<Contract | null>(null);
  const [storageContract, setStorageContract] = useState<Contract | null>(null);
  const [govContract, setGovContract] = useState<Contract | null>(null); // Deprecated

  // Role State
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GUEST);

  const checkVetLicense = async (
    address: string,
    nft: Contract
  ): Promise<bigint> => {
    try {
      const licenseId = await nft.vetWalletToLicenseId(address);
      return licenseId;
    } catch (e) {
      console.error("Error checking license:", e);
      return 0n;
    }
  };

  const determineRole = async (address: string, nft: Contract) => {
    try {
      // 1. Check Vet (Linked License via Registry)
      const licenseId = await checkVetLicense(address, nft);
      if (licenseId > 0n) {
        setUserRole(UserRole.VET);
        return;
      }

      // 2. Check Owner (Has Pet Balance)
      const balance = await nft.balanceOf(address);
      if (balance > 0n) {
        setUserRole(UserRole.OWNER);
        return;
      }

      // Default
      setUserRole(UserRole.GUEST);
    } catch (error) {
      console.error("Error determining role:", error);
      setUserRole(UserRole.GUEST);
    }
  };

  const initContracts = useCallback(
    async (currentProvider: BrowserProvider, currentAccount: string) => {
      try {
        const signer = await currentProvider.getSigner();

        const nft = new Contract(
          CONTRACT_ADDRESSES.ANIMAL_NFT,
          ABIS.NFT,
          signer
        );
        const storage = new Contract(
          CONTRACT_ADDRESSES.STORAGE,
          ABIS.STORAGE,
          signer
        );

        setNftContract(nft);
        setStorageContract(storage);
        setGovContract(null);

        // Determine Role immediately
        await determineRole(currentAccount, nft);
      } catch (error) {
        console.error("Error initializing contracts:", error);
      }
    },
    []
  );

  const checkConnection = useCallback(async () => {
    if (window.ethereum) {
      try {
        const currentProvider = new BrowserProvider(window.ethereum);
        setProvider(currentProvider);

        const accounts = await currentProvider.listAccounts();
        if (accounts.length > 0) {
          const address = accounts[0].address;
          setAccount(address);
          await initContracts(currentProvider, address);
        }

        const network = await currentProvider.getNetwork();
        setChainId("0x" + network.chainId.toString(16));

        // Listeners
        window.ethereum.on("accountsChanged", (accounts: string[]) => {
          window.location.reload();
        });

        window.ethereum.on("chainChanged", () => {
          window.location.reload();
        });
      } catch (err) {
        console.error("Failed to check connection", err);
      }
    }
  }, [initContracts]);

  useEffect(() => {
    checkConnection();
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, [checkConnection]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("¡Por favor instala MetaMask!");
      return;
    }
    setIsConnecting(true);
    try {
      const currentProvider = new BrowserProvider(window.ethereum);
      const accounts = await currentProvider.send("eth_requestAccounts", []);
      const address = accounts[0];
      setAccount(address);
      setProvider(currentProvider);

      await initContracts(currentProvider, address);

      const network = await currentProvider.getNetwork();
      setChainId("0x" + network.chainId.toString(16));
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        alert("La red Sepolia no está agregada a tu MetaMask.");
      } else {
        console.error(switchError);
      }
    }
  };

  return {
    account,
    chainId,
    isConnecting,
    isConnected: !!account,
    isCorrectNetwork: chainId === SEPOLIA_CHAIN_ID,
    userRole,
    provider,
    govContract, // Returns null
    nftContract,
    storageContract,
    connectWallet,
    switchNetwork,
    checkVetLicense,
  };
};
