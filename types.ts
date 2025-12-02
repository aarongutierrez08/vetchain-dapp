export interface MedicalRecord {
  timestamp: bigint;
  description: string;
  vetAddress: string;
  recordType: number; // 0: General, 1: Vaccine, 2: Surgery, 3: XRay, 4: Deceased
}

export interface Animal {
  tokenId: string; // Chip ID as string
  uri: string;
  isLost?: boolean;
}

export enum UserRole {
  GUEST = 'GUEST',
  ADMIN = 'ADMIN',
  VET = 'VET',
  OWNER = 'OWNER'
}

export interface Web3State {
  account: string | null;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  userRole: UserRole;
  connectWallet: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  provider: any;
  govContract: any;
  nftContract: any;
  storageContract: any;
}