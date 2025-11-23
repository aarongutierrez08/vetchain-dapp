import React, { useState } from 'react';
import { Contract } from 'ethers';
import { Input } from './Input';
import { Button } from './Button';
import { MedicalRecord } from '../types';

interface VetDashboardProps {
  nftContract: Contract | null;
  storageContract: Contract | null;
}

export const VetDashboard: React.FC<VetDashboardProps> = ({ nftContract, storageContract }) => {
  // Search State
  const [searchTokenId, setSearchTokenId] = useState('');
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const [history, setHistory] = useState<MedicalRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Medical Record Form State
  const [desc, setDesc] = useState('');
  const [isVaccine, setIsVaccine] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [recordStatus, setRecordStatus] = useState<string | null>(null);

  // Register Animal Form State
  const [regOwner, setRegOwner] = useState('');
  const [regChipId, setRegChipId] = useState('');
  const [regUri, setRegUri] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regStatus, setRegStatus] = useState<string | null>(null);

  // --- Registration Logic ---
  const handleRegisterAnimal = async () => {
    if (!nftContract) return;
    if (!regOwner || !regChipId || !regUri) {
      alert("Por favor completa todos los campos");
      return;
    }

    setIsRegistering(true);
    setRegStatus(null);
    try {
      // Calls: function registerAnimal(address _toOwner, uint256 _chipId, string memory _uri)
      const tx = await nftContract.registerAnimal(regOwner, regChipId, regUri);
      setRegStatus(`Procesando Registro: ${tx.hash}...`);
      await tx.wait();
      setRegStatus(`¡Éxito! Animal Chip #${regChipId} registrado a ${regOwner}`);
      
      // Clear form
      setRegOwner('');
      setRegChipId('');
      setRegUri('');
    } catch (error: any) {
      console.error(error);
      setRegStatus(`Error: ${error.reason || error.message || "Asegúrate de ser un veterinario autorizado."}`);
    } finally {
      setIsRegistering(false);
    }
  };

  // --- History Logic ---
  const fetchHistory = async (id: string) => {
    if (!storageContract) return;
    setLoadingHistory(true);
    setHistory([]);
    try {
      const data = await storageContract.getHistory(id);
      
      const formattedHistory: MedicalRecord[] = data.map((item: any) => ({
        timestamp: item.timestamp,
        description: item.description,
        vetAddress: item.vetAddress,
        isVaccine: item.isVaccine
      }));
      
      setHistory(formattedHistory.reverse());
      setActiveTokenId(id);
    } catch (error) {
      console.error("Error fetching history:", error);
      alert("No se pudo obtener el historial. Verifica si el Token ID existe.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSearch = () => {
    if(!searchTokenId) return;
    fetchHistory(searchTokenId);
  };

  // --- Medical Record Logic ---
  const handleAddRecord = async () => {
    if (!nftContract || !activeTokenId) return;
    setIsAdding(true);
    setRecordStatus(null);
    try {
      const tx = await nftContract.addMedicalRecord(activeTokenId, desc, isVaccine);
      setRecordStatus(`Procesando Registro: ${tx.hash}...`);
      await tx.wait();
      setRecordStatus('¡Historial médico agregado con éxito!');
      setDesc('');
      setIsVaccine(false);
      fetchHistory(activeTokenId);
    } catch (error: any) {
      console.error(error);
      setRecordStatus(`Error: ${error.reason || error.message || "Verifica si estás aprobado por el dueño."}`);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* 1. Register New Patient Section */}
      <div className="bg-surface p-6 rounded-xl shadow-lg border border-primary/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <span className="text-9xl">🐕</span>
        </div>
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <span className="text-primary">✚</span> Registrar Nuevo Paciente
        </h2>
        
        {regStatus && (
          <div className={`mb-6 p-4 rounded-lg border ${regStatus.includes('Error') ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-green-500/10 border-green-500/50 text-green-200'}`}>
            {regStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <Input 
            label="Dirección del Dueño (0x...)" 
            placeholder="ej. 0x123..." 
            value={regOwner}
            onChange={(e) => setRegOwner(e.target.value)}
          />
          <Input 
            label="ID de Chip (Token ID)" 
            type="number"
            placeholder="ej. 1001" 
            value={regChipId}
            onChange={(e) => setRegChipId(e.target.value)}
          />
          <Input 
            label="URI de Metadatos / Nombre" 
            placeholder="ej. ipfs://... o 'Max'" 
            value={regUri}
            onChange={(e) => setRegUri(e.target.value)}
          />
          <Button 
            onClick={handleRegisterAnimal} 
            isLoading={isRegistering}
            variant="primary"
            className="w-full"
          >
            Registrar Paciente y Asignar Dueño
          </Button>
        </div>
      </div>

      <hr className="border-slate-700" />

      {/* 2. Medical Records Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-white">🏥 Portal Médico</h2>
        
        {/* Search Bar */}
        <div className="bg-surface p-6 rounded-xl shadow-lg border border-slate-700 mb-6">
          <div className="flex gap-4 items-end max-w-lg">
            <Input 
              label="Buscar Animal por ID de Chip" 
              placeholder="ej. 1001" 
              value={searchTokenId}
              onChange={(e) => setSearchTokenId(e.target.value)}
            />
            <Button onClick={handleSearch} isLoading={loadingHistory}>
              Buscar Historial
            </Button>
          </div>
        </div>

        {activeTokenId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Add Record Form */}
            <div className="bg-surface p-6 rounded-xl shadow-lg border border-slate-700 h-fit">
              <h3 className="text-xl font-bold text-white mb-4">Agregar Entrada para Chip ID: <span className="text-primary">{activeTokenId}</span></h3>
              
              {recordStatus && (
                <div className={`mb-4 p-3 rounded text-sm ${recordStatus.includes('Error') ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}>
                  {recordStatus}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 block mb-1">Descripción Médica</label>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none h-32 resize-none"
                    placeholder="Diagnóstico, notas de tratamiento, etc."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  ></textarea>
                </div>

                <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <input 
                    type="checkbox" 
                    id="vaccineCheck"
                    className="w-5 h-5 text-primary rounded focus:ring-primary bg-slate-700 border-slate-600"
                    checked={isVaccine}
                    onChange={(e) => setIsVaccine(e.target.checked)}
                  />
                  <label htmlFor="vaccineCheck" className="text-white cursor-pointer select-none">
                    ¿Es una Vacuna? 💉
                  </label>
                </div>

                <Button onClick={handleAddRecord} isLoading={isAdding} className="w-full">
                  Enviar Registro Médico
                </Button>
              </div>
            </div>

            {/* History View */}
            <div className="bg-surface p-6 rounded-xl shadow-lg border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Historial Médico</h3>
              
              {history.length === 0 ? (
                <div className="text-slate-400 italic py-8 text-center border-2 border-dashed border-slate-700 rounded-lg">
                  No se encontraron registros para este animal.
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {history.map((record, idx) => (
                    <div key={idx} className="bg-slate-900 border-l-4 border-primary p-4 rounded-r-lg shadow-sm hover:bg-slate-800 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(Number(record.timestamp) * 1000).toLocaleString()}
                        </span>
                        {record.isVaccine && (
                          <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded font-bold border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                            VACUNACIÓN
                          </span>
                        )}
                      </div>
                      <p className="text-slate-200 text-sm mb-3">{record.description}</p>
                      <div className="text-xs text-slate-500 font-mono truncate bg-black/30 p-1.5 rounded w-fit">
                        Vet: {record.vetAddress}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};