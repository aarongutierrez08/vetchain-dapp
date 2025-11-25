export interface MedicalRecord {
  timestamp: bigint;
  description: string;
  vetAddress: string;
  recordType: number; // 0: General, 1: Vaccine, 2: Surgery, 3: XRay
}

export interface Animal {
  tokenId: string; // Changed from number to string to support large Chip IDs safely
  uri: string;
  isLost?: boolean;
}

export enum ViewState {
  HOME = "HOME",
  ADMIN = "ADMIN",
  OWNER = "OWNER",
  VET = "VET",
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
