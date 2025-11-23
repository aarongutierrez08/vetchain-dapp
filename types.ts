export interface MedicalRecord {
  timestamp: bigint;
  description: string;
  vetAddress: string;
  isVaccine: boolean;
}

export interface Animal {
  tokenId: string; // Changed from number to string to support large Chip IDs safely
  uri: string;
}

export enum ViewState {
  HOME = 'HOME',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  VET = 'VET'
}

export interface Web3State {
  account: string | null;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  connectWallet: () => Promise<void>;
  switchNetwork: () => Promise<void>;
}