import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, EthersError } from 'ethers';
import { CONTRACT_ADDRESSES, ABIS, SEPOLIA_CHAIN_ID } from '../constants';

export const useBlockchain = () => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Contract Instances
  const [govContract, setGovContract] = useState<Contract | null>(null);
  const [nftContract, setNftContract] = useState<Contract | null>(null);
  const [storageContract, setStorageContract] = useState<Contract | null>(null);

  const initContracts = useCallback(async (currentProvider: BrowserProvider) => {
    try {
      const signer = await currentProvider.getSigner();
      
      const gov = new Contract(CONTRACT_ADDRESSES.GOVERNANCE, ABIS.GOVERNANCE, signer);
      const nft = new Contract(CONTRACT_ADDRESSES.NFT, ABIS.NFT, signer);
      const storage = new Contract(CONTRACT_ADDRESSES.STORAGE, ABIS.STORAGE, signer);

      setGovContract(gov);
      setNftContract(nft);
      setStorageContract(storage);
    } catch (error) {
      console.error("Error initializing contracts:", error);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    if (window.ethereum) {
      try {
        const currentProvider = new BrowserProvider(window.ethereum);
        setProvider(currentProvider);

        const accounts = await currentProvider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          await initContracts(currentProvider);
        }

        const network = await currentProvider.getNetwork();
        setChainId('0x' + network.chainId.toString(16));
        
        // Listen for changes
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            window.location.reload(); // Simple reload to refresh contract signers
          } else {
            setAccount(null);
            setGovContract(null);
            setNftContract(null);
            setStorageContract(null);
          }
        });

        window.ethereum.on('chainChanged', () => {
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
        if(window.ethereum) {
            window.ethereum.removeAllListeners();
        }
    }
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
      setAccount(accounts[0]);
      setProvider(currentProvider);
      await initContracts(currentProvider);
      
      const network = await currentProvider.getNetwork();
      setChainId('0x' + network.chainId.toString(16));
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
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        alert("La red Sepolia no está agregada a tu MetaMask. Por favor agrégala manualmente.");
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
    provider,
    govContract,
    nftContract,
    storageContract,
    connectWallet,
    switchNetwork,
  };
};

// Global augmentation for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}