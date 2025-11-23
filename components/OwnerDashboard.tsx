import React, { useState } from 'react';
import { Contract } from 'ethers';
import { Button } from './Button';
import { Input } from './Input';
import { Animal } from '../types';

interface OwnerDashboardProps {
  nftContract: Contract | null;
  account: string;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ nftContract, account }) => {
  const [pets, setPets] = useState<Animal[]>([]);
  const [searchChipId, setSearchChipId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);
  
  // Transfer/Approve states mapped by tokenId (string key now)
  const [actionInputs, setActionInputs] = useState<{[key: string]: string}>({});
  const [actionLoading, setActionLoading] = useState<{[key: string]: string}>({});

  const handleAddPet = async () => {
    if (!nftContract || !account || !searchChipId) return;
    
    // Prevent duplicates
    if (pets.some(p => p.tokenId === searchChipId)) {
        setStatusMsg({ type: 'error', text: 'Esta mascota ya está en tu panel.' });
        return;
    }

    setIsSearching(true);
    setStatusMsg(null);

    try {
      // 1. Check ownership
      const ownerAddress = await nftContract.ownerOf(searchChipId);
      
      if (ownerAddress.toLowerCase() !== account.toLowerCase()) {
        setStatusMsg({ type: 'error', text: 'No eres el dueño de este ID de Chip.' });
        return;
      }

      // 2. Fetch Metadata
      const uri = await nftContract.tokenURI(searchChipId);
      
      // 3. Add to list
      setPets(prev => [...prev, { tokenId: searchChipId, uri }]);
      setStatusMsg({ type: 'success', text: `¡Mascota #${searchChipId} agregada con éxito!` });
      setSearchChipId(''); // Clear input
      
    } catch (error: any) {
      console.error("Error finding pet:", error);
      if (error.reason && error.reason.includes('ERC721NonexistentToken')) {
          setStatusMsg({ type: 'error', text: 'El ID de Chip no existe en la cadena.' });
      } else {
          setStatusMsg({ type: 'error', text: 'Error al buscar mascota. Revisa el ID o la consola.' });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleApproveVet = async (tokenId: string) => {
    const vetAddr = actionInputs[`approve-${tokenId}`];
    if (!nftContract || !vetAddr) return;

    setActionLoading(prev => ({...prev, [tokenId]: 'approving'}));
    try {
      const tx = await nftContract.approveVet(vetAddr, tokenId);
      await tx.wait();
      alert(`Vet ${vetAddr} aprobado para Mascota #${tokenId}`);
      setActionInputs(prev => ({...prev, [`approve-${tokenId}`]: ''}));
    } catch (error: any) {
      alert(`Error al aprobar: ${error.reason || error.message}`);
    } finally {
      setActionLoading(prev => ({...prev, [tokenId]: ''}));
    }
  };

  const handleTransfer = async (tokenId: string) => {
    const toAddr = actionInputs[`transfer-${tokenId}`];
    if (!nftContract || !toAddr) return;

    setActionLoading(prev => ({...prev, [tokenId]: 'transferring'}));
    try {
      const tx = await nftContract.transferFrom(account, toAddr, tokenId);
      await tx.wait();
      alert(`Mascota #${tokenId} transferida a ${toAddr}`);
      // Remove from local list after transfer
      setPets(prev => prev.filter(p => p.tokenId !== tokenId));
    } catch (error: any) {
      alert(`Transferencia Fallida: ${error.reason || "Asegúrate de que la mascota esté vacunada o estés autorizado."}`);
    } finally {
      setActionLoading(prev => ({...prev, [tokenId]: ''}));
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setActionInputs(prev => ({...prev, [key]: value}));
  };

  return (
    <div className="space-y-8">
      {/* Introduction Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-bold mb-2 text-white">🐾 Panel de Mis Mascotas</h2>
        <p className="text-slate-400">
          Gestiona tus mascotas registradas. Dado que la blockchain no almacena una lista automática de tus mascotas, 
          por favor ingresa el <strong>ID de Chip</strong> proporcionado por tu veterinario para cargar el perfil de tu mascota.
        </p>
      </div>

      {/* Import Pet Section */}
      <div className="bg-surface p-6 rounded-xl shadow-lg border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">Buscar mi Mascota</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
                <Input 
                    label="Ingresar ID de Chip (Token ID)"
                    placeholder="ej. 1001"
                    value={searchChipId}
                    onChange={(e) => setSearchChipId(e.target.value)}
                    type="number"
                />
             </div>
             <Button onClick={handleAddPet} isLoading={isSearching} className="w-full md:w-auto">
                Agregar al Panel
             </Button>
          </div>
          {statusMsg && (
              <div className={`mt-4 p-3 rounded text-sm ${statusMsg.type === 'error' ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}>
                  {statusMsg.text}
              </div>
          )}
      </div>

      {/* Pet Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Tu Panel ({pets.length})</h2>
        
        {pets.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400">
            <div className="text-4xl mb-4">🐕</div>
            <p className="text-lg">No hay mascotas cargadas aún.</p>
            <p className="text-sm mt-2">Ingresa tu ID de Chip arriba para ver tu mascota.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map((pet) => (
              <div key={pet.tokenId} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-md flex flex-col animate-fade-in">
                <div className="h-48 bg-slate-900 w-full relative group">
                  {/* Using a placeholder image generation based on tokenId */}
                  <img 
                    src={`https://picsum.photos/seed/${pet.tokenId}/400/300`} 
                    alt="Pet" 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-mono border border-slate-600">
                    ID Chip: {pet.tokenId}
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white truncate" title={pet.uri}>{pet.uri}</h3>
                    <p className="text-xs text-slate-500">Metadatos</p>
                  </div>
                  
                  {/* Approve Vet */}
                  <div className="bg-slate-900/50 p-3 rounded-lg space-y-2 border border-slate-700/50">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                      <span>🏥</span> Autorizar Vet
                    </label>
                    <p className="text-[10px] text-slate-400 leading-tight">Permitir que un veterinario agregue registros médicos.</p>
                    <div className="flex gap-2">
                      <input 
                        className="bg-slate-800 text-white text-xs p-2 rounded w-full border border-slate-700 focus:border-secondary outline-none transition-colors"
                        placeholder="Dirección Vet (0x...)"
                        value={actionInputs[`approve-${pet.tokenId}`] || ''}
                        onChange={(e) => handleInputChange(`approve-${pet.tokenId}`, e.target.value)}
                      />
                      <Button 
                        variant="secondary" 
                        className="!px-3 !py-1 text-xs whitespace-nowrap"
                        isLoading={actionLoading[pet.tokenId] === 'approving'}
                        onClick={() => handleApproveVet(pet.tokenId)}
                      >
                        Aprobar
                      </Button>
                    </div>
                  </div>

                  {/* Transfer */}
                  <div className="bg-slate-900/50 p-3 rounded-lg space-y-2 mt-auto border border-slate-700/50">
                    <label className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                      <span>🔁</span> Transferir
                    </label>
                    <div className="flex gap-2">
                      <input 
                        className="bg-slate-800 text-white text-xs p-2 rounded w-full border border-slate-700 focus:border-accent outline-none transition-colors"
                        placeholder="Nuevo Dueño (0x...)"
                        value={actionInputs[`transfer-${pet.tokenId}`] || ''}
                        onChange={(e) => handleInputChange(`transfer-${pet.tokenId}`, e.target.value)}
                      />
                      <Button 
                        variant="danger" 
                        className="!px-3 !py-1 text-xs whitespace-nowrap"
                        isLoading={actionLoading[pet.tokenId] === 'transferring'}
                        onClick={() => handleTransfer(pet.tokenId)}
                      >
                        Enviar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};