import React, { useState, useEffect, useCallback } from "react";
import { Contract } from "ethers";
import { Button } from "./Button";
import { SmartAddressInput } from "./SmartAddressInput";
import { Animal } from "../types";
import { MedicalHistoryTable } from "./MedicalHistoryTable";

const resolveIPFS = (url: string | undefined): string => {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }
  return url;
};

interface OwnerDashboardProps {
  nftContract: Contract | null;
  storageContract: Contract | null;
  account: string;
  onBack: () => void;
}

interface PetMetadata {
  name: string;
  description?: string;
  image: string;
}

const PetCard: React.FC<{
  pet: Animal;
  nftContract: Contract;
  storageContract: Contract | null;
  account: string;
  onRemove: (id: string) => void;
  onUpdateLostStatus: (id: string, status: boolean) => void;
}> = ({
  pet,
  nftContract,
  storageContract,
  account,
  onRemove,
  onUpdateLostStatus,
}) => {
  const [metadata, setMetadata] = useState<PetMetadata | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [isDeceased, setIsDeceased] = useState(false);

  // Smart Input States
  const [approveInput, setApproveInput] = useState("");
  const [approveAddr, setApproveAddr] = useState<string | null>(null);

  const [transferInput, setTransferInput] = useState("");
  const [transferAddr, setTransferAddr] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // History Modal State
  const [showHistory, setShowHistory] = useState(false);

  // Fetch Metadata & Deceased Status
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoadingMeta(true);
        // Metadata
        const gatewayUrl = resolveIPFS(pet.uri);
        const response = await fetch(gatewayUrl);
        if (!response.ok) throw new Error("Fetch failed");

        const json = await response.json();

        // Deceased Check: Query storage history
        let dead = false;
        if (storageContract) {
          const filter = storageContract.filters.MedicalRecordAdded(
            pet.tokenId
          );
          const events = await storageContract.queryFilter(filter);
          if (events.length > 0) {
            const latestEvent: any = events.sort(
              (a: any, b: any) => Number(b.args[1]) - Number(a.args[1])
            )[0];
            if (Number(latestEvent.args[4]) === 4) dead = true;
          }
        }

        if (isMounted) {
          setMetadata({
            name: json.name || "Sin Nombre",
            description: json.description,
            image: resolveIPFS(json.image),
          });
          setIsDeceased(dead);
        }
      } catch (error) {
        if (isMounted) {
          setMetadata({
            name: `Chip #${pet.tokenId}`,
            image: "https://placehold.co/400x300?text=No+Metadata",
          });
        }
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    };
    if (pet.uri) loadData();
    return () => {
      isMounted = false;
    };
  }, [pet.uri, pet.tokenId, storageContract]);

  const handleApproveVet = async () => {
    if (!approveAddr) {
      alert("Dirección de Veterinario inválida.");
      return;
    }
    setActionLoading("approving");
    try {
      const tx = await nftContract.approveVet(approveAddr, pet.tokenId);
      await tx.wait();
      alert(`Vet ${approveAddr} aprobado.`);
      setApproveInput("");
      setApproveAddr(null);
    } catch (error: any) {
      alert(`Error: ${error.reason || error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransfer = async () => {
    if (!transferAddr) {
      alert("Dirección de destino inválida.");
      return;
    }
    setActionLoading("transferring");
    try {
      const tx = await nftContract.safeTransferFrom(
        account,
        transferAddr,
        pet.tokenId
      );
      await tx.wait();
      alert(`Mascota transferida.`);
      onRemove(pet.tokenId);
    } catch (error: any) {
      alert(`Error: ${error.reason || error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleLost = async () => {
    setActionLoading("toggling_lost");
    try {
      const tx = await nftContract.setLostStatus(pet.tokenId, !pet.isLost);
      await tx.wait();
      onUpdateLostStatus(pet.tokenId, !pet.isLost);
    } catch (error: any) {
      alert(`Error: ${error.reason || error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getBorderClass = () => {
    if (isDeceased) return "border-zinc-600 shadow-xl bg-zinc-900";
    if (pet.isLost) return "border-red-500 shadow-red-900/20";
    return "border-slate-700";
  };

  return (
    <>
      <div
        className={`bg-slate-800 rounded-xl overflow-hidden border shadow-md flex flex-col transition-all ${getBorderClass()}`}
      >
        <div className="h-48 bg-slate-900 w-full relative group">
          {loadingMeta ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 animate-pulse">
              <span className="text-slate-500 text-sm">Cargando...</span>
            </div>
          ) : (
            <img
              src={metadata?.image}
              alt={metadata?.name}
              className={`w-full h-full object-cover ${
                pet.isLost ? "grayscale opacity-50" : ""
              } ${isDeceased ? "grayscale contrast-125" : ""}`}
            />
          )}
          <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-mono border border-slate-600">
            ID: {pet.tokenId}
          </div>
          {pet.isLost && !isDeceased && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-red-600/90 text-white font-black text-xl px-4 py-1 rounded border-2 border-white -rotate-12 shadow-xl">
                ¡PERDIDO!
              </span>
            </div>
          )}
          {isDeceased && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="bg-black text-white font-black text-xl px-4 py-2 border-y-4 border-zinc-500">
                ⚰️ FALLECIDO
              </span>
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col gap-4">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold text-white truncate">
                {metadata?.name}
              </h3>
              <button
                onClick={() => setShowHistory(true)}
                className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/30 transition-colors"
              >
                📜 Historial
              </button>
            </div>
            <p className="text-xs text-slate-400 truncate mt-1">
              {metadata?.description}
            </p>
          </div>

          <Button
            variant={pet.isLost ? "success" : "danger"}
            className="w-full text-sm py-1"
            isLoading={actionLoading === "toggling_lost"}
            onClick={handleToggleLost}
            disabled={isDeceased}
          >
            {pet.isLost ? "¡Encontrado!" : "Reportar Perdido"}
          </Button>

          <div
            className={`bg-slate-900/50 p-3 rounded-lg space-y-2 border border-slate-700/50 ${
              isDeceased ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <label className="text-xs font-bold text-secondary uppercase">
              Autorizar Vet
            </label>
            <div className="flex flex-col gap-2">
              <SmartAddressInput
                value={approveInput}
                onChange={setApproveInput}
                onAddressResolved={setApproveAddr}
                placeholder="Email o 0x..."
              />
              <Button
                onClick={handleApproveVet}
                disabled={!approveAddr}
                isLoading={actionLoading === "approving"}
                variant="secondary"
                className="w-full text-xs h-[32px]"
              >
                Confirmar
              </Button>
            </div>
          </div>

          <div
            className={`bg-slate-900/50 p-3 rounded-lg space-y-2 mt-auto border border-slate-700/50 ${
              isDeceased ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <label className="text-xs font-bold text-accent uppercase">
              Transferir
            </label>
            <div className="flex flex-col gap-2">
              <SmartAddressInput
                value={transferInput}
                onChange={setTransferInput}
                onAddressResolved={setTransferAddr}
                placeholder="Email o 0x..."
              />
              <Button
                onClick={handleTransfer}
                disabled={!transferAddr}
                isLoading={actionLoading === "transferring"}
                variant="danger"
                className="w-full text-xs h-[32px]"
              >
                Transferir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Medical History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                📑 Historia Clínica: {metadata?.name}
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <MedicalHistoryTable
                tokenId={pet.tokenId}
                storageContract={storageContract}
              />
            </div>
            <div className="p-4 border-t border-slate-700 bg-slate-800/50 rounded-b-xl">
              <Button
                onClick={() => setShowHistory(false)}
                variant="secondary"
                className="w-full"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  nftContract,
  storageContract,
  account,
  onBack,
}) => {
  const [pets, setPets] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyPets = useCallback(async () => {
    if (!nftContract || !account) return;
    setIsLoading(true);
    try {
      // 1. Get all Transfer events where 'to' is current account
      const filter = nftContract.filters.Transfer(undefined, account);
      const events = await nftContract.queryFilter(filter);

      // 2. Extract unique token IDs
      const candidateIds = new Set<string>();
      events.forEach((event: any) => {
        if (event.args && event.args[2]) {
          candidateIds.add(event.args[2].toString());
        }
      });

      // 3. Verify current ownership
      const validPets: Animal[] = [];

      for (const tokenId of candidateIds) {
        try {
          const currentOwner = await nftContract.ownerOf(tokenId);
          if (currentOwner.toLowerCase() === account.toLowerCase()) {
            const uri = await nftContract.tokenURI(tokenId);
            const isLost = await nftContract.isLost(tokenId);
            validPets.push({ tokenId, uri, isLost });
          }
        } catch (err) {
          console.warn(`Could not verify ownership of ${tokenId}`, err);
        }
      }

      setPets(validPets);
    } catch (error) {
      console.error("Error auto-fetching pets:", error);
      alert("Error cargando mascotas desde la blockchain.");
    } finally {
      setIsLoading(false);
    }
  }, [nftContract, account]);

  useEffect(() => {
    fetchMyPets();
  }, [fetchMyPets]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <span>⬅</span> Volver al Menú
      </button>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Mis Mascotas</h2>
        <Button
          onClick={() => fetchMyPets()}
          variant="secondary"
          className="!py-1 !text-sm"
        >
          Refrescar Lista
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p className="text-slate-400">
            Escaneando blockchain en busca de tus mascotas...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <PetCard
              key={pet.tokenId}
              pet={pet}
              nftContract={nftContract!}
              storageContract={storageContract}
              account={account}
              onRemove={(id) =>
                setPets((p) => p.filter((x) => x.tokenId !== id))
              }
              onUpdateLostStatus={(id, status) =>
                setPets((p) =>
                  p.map((x) =>
                    x.tokenId === id ? { ...x, isLost: status } : x
                  )
                )
              }
            />
          ))}
          {pets.length === 0 && (
            <div className="col-span-full text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
              <span className="text-4xl block mb-4">🐕</span>
              <p className="text-slate-400 text-lg">
                No se encontraron mascotas asociadas a tu cuenta.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Si acabas de recibir una, espera unos segundos y refresca.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
