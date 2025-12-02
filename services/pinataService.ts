// services/pinataService.ts

// Safely access environment variables
const env = (import.meta as any).env || {};
const PINATA_API_KEY = env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = env.VITE_PINATA_SECRET_API_KEY;

export const uploadFileToIPFS = async (file: File): Promise<string> => {
  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    throw new Error("Pinata API Keys are missing in .env");
  }

  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  const data = new FormData();
  data.append('file', file);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      },
      body: data
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error("Error uploading file to Pinata:", error);
    throw error;
  }
};

export const uploadJSONToIPFS = async (jsonData: any): Promise<string> => {
  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    throw new Error("Pinata API Keys are missing in .env");
  }

  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      },
      body: JSON.stringify(jsonData)
    });

    if (!response.ok) {
      throw new Error(`Pinata JSON upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error("Error uploading JSON to Pinata:", error);
    throw error;
  }
};