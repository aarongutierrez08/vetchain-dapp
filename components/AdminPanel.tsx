import React, { useState } from 'react';
import { Contract } from 'ethers';
import { Input } from './Input';
import { Button } from './Button';

interface AdminPanelProps {
  govContract: Contract | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ govContract }) => {
  const [vetAddress, setVetAddress] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [loadingVet, setLoadingVet] = useState(false);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSetVet = async (isAuthorized: boolean) => {
    if (!govContract || !vetAddress) return;
    setLoadingVet(true);
    setStatus(null);
    try {
      const tx = await govContract.setVetStatus(vetAddress, isAuthorized);
      setStatus(`Procesando transacción: ${tx.hash}...`);
      await tx.wait();
      setStatus(isAuthorized ? '¡Veterinario Certificado con éxito!' : 'Veterinario Revocado.');
      setVetAddress('');
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.reason || error.message}`);
    } finally {
      setLoadingVet(false);
    }
  };

  const handleSetOwner = async (isAuthorized: boolean) => {
    if (!govContract || !ownerAddress) return;
    setLoadingOwner(true);
    setStatus(null);
    try {
      const tx = await govContract.setAptOwnerStatus(ownerAddress, isAuthorized);
      setStatus(`Procesando transacción: ${tx.hash}...`);
      await tx.wait();
      setStatus(isAuthorized ? '¡Dueño Autorizado con éxito!' : 'Dueño Revocado.');
      setOwnerAddress('');
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.reason || error.message}`);
    } finally {
      setLoadingOwner(false);
    }
  };

  return (
    <div className="bg-surface p-6 rounded-xl shadow-xl max-w-2xl mx-auto border border-slate-700">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <span className="text-primary">🛡️</span> Gobernanza de Administrador
      </h2>

      {status && (
        <div className={`mb-6 p-4 rounded-lg ${status.includes('Error') ? 'bg-red-500/20 text-red-200 border border-red-500/50' : 'bg-green-500/20 text-green-200 border border-green-500/50'}`}>
          {status}
        </div>
      )}

      <div className="space-y-8">
        <div className="p-5 bg-slate-900/50 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Gestionar Veterinarios</h3>
          <div className="flex flex-col gap-4">
            <Input 
              placeholder="0x..." 
              label="Dirección del Veterinario"
              value={vetAddress}
              onChange={(e) => setVetAddress(e.target.value)}
            />
            <div className="flex gap-4">
              <Button 
                onClick={() => handleSetVet(true)} 
                isLoading={loadingVet}
                className="flex-1"
                variant="success"
              >
                Certificar Vet
              </Button>
              <Button 
                onClick={() => handleSetVet(false)} 
                isLoading={loadingVet}
                className="flex-1"
                variant="danger"
              >
                Revocar Vet
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-900/50 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Gestionar Dueños</h3>
          <div className="flex flex-col gap-4">
            <Input 
              placeholder="0x..." 
              label="Dirección del Dueño"
              value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
            />
            <div className="flex gap-4">
              <Button 
                onClick={() => handleSetOwner(true)} 
                isLoading={loadingOwner}
                className="flex-1"
                variant="success"
              >
                Autorizar Dueño
              </Button>
              <Button 
                onClick={() => handleSetOwner(false)} 
                isLoading={loadingOwner}
                className="flex-1"
                variant="danger"
              >
                Revocar Dueño
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};