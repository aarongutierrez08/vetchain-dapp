import React, { useState, useEffect } from "react";
import { Contract } from "ethers";
import { Button } from "./Button";
import { Input } from "./Input";
import { Animal } from "../types";

// --- Helper para IPFS ---
const resolveIPFS = (url: string | undefined): string => {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }
  return url;
};

// --- Interfaces ---
interface OwnerDashboardProps {
  nftContract: Contract | null;
  account: string;
}

interface PetMetadata {
  name: string;
  description?: string;
  image: string;
}

// --- Sub-componente: Tarjeta Individual de Mascota ---
// Maneja su propio fetch de metadatos y estados de input para acciones
const PetCard: React.FC<{
  pet: Animal;
  nftContract: Contract;
  account: string;
  onRemove: (id: string) => void;
  onUpdateLostStatus: (id: string, status: boolean) => void;
}> = ({ pet, nftContract, account, onRemove, onUpdateLostStatus }) => {
  // Estado de Metadatos
  const [metadata, setMetadata] = useState<PetMetadata | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Estado de Acciones
  const [approveAddr, setApproveAddr] = useState("");
  const [transferAddr, setTransferAddr] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 1. Fetch de Metadatos (JSON desde IPFS)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoadingMeta(true);
        const gatewayUrl = resolveIPFS(pet.uri);

        const response = await fetch(gatewayUrl);
        if (!response.ok) throw new Error("Fetch failed");

        const json = await response.json();

        // Procesar la imagen que viene dentro del JSON (puede ser ipfs:// también)
        const resolvedImage = resolveIPFS(json.image);

        setMetadata({
          name: json.name || "Sin Nombre",
          description: json.description,
          image: resolvedImage,
        });
      } catch (error) {
        console.error("Error loading metadata for", pet.tokenId, error);
        setMetadata({
          name: `Mascota #${pet.tokenId}`,
          image: "https://placehold.co/400x300?text=No+Metadata",
        });
      } finally {
        setLoadingMeta(false);
      }
    };

    if (pet.uri) {
      fetchMetadata();
    }
  }, [pet.uri, pet.tokenId]);

  // 2. Acciones del Smart Contract
  const handleApproveVet = async () => {
    if (!approveAddr) return;
    setActionLoading("approving");
    try {
      const tx = await nftContract.approveVet(approveAddr, pet.tokenId);
      await tx.wait();
      alert(`Vet ${approveAddr} aprobado para ${metadata?.name}`);
      setApproveAddr("");
    } catch (error: any) {
      alert(`Error: ${error.reason || error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransfer = async () => {
    if (!transferAddr) return;
    setActionLoading("transferring");
    try {
      const tx = await nftContract.transferFrom(
        account,
        transferAddr,
        pet.tokenId
      );
      await tx.wait();
      alert(`${metadata?.name} transferido a ${transferAddr}`);
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

  return (
    <div
      className={`bg-slate-800 rounded-xl overflow-hidden border shadow-md flex flex-col transition-all ${
        pet.isLost ? "border-red-500 shadow-red-900/20" : "border-slate-700"
      }`}
    >
      {/* Sección de Imagen */}
      <div className="h-48 bg-slate-900 w-full relative group">
        {loadingMeta ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 animate-pulse">
            <span className="text-slate-500 text-sm">Cargando IPFS...</span>
          </div>
        ) : (
          <img
            src={metadata?.image}
            alt={metadata?.name}
            className={`w-full h-full object-cover transition-opacity ${
              pet.isLost
                ? "opacity-50 grayscale"
                : "opacity-90 group-hover:opacity-100"
            }`}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/400x300?text=Error+Imagen";
            }}
          />
        )}

        <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-mono border border-slate-600 backdrop-blur-sm">
          ID: {pet.tokenId}
        </div>

        {pet.isLost && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <span className="bg-red-600/90 text-white font-black text-xl px-6 py-2 rounded border-2 border-white transform -rotate-12 shadow-xl backdrop-blur-sm">
              ⚠️ PERDIDO
            </span>
          </div>
        )}
      </div>

      {/* Sección de Contenido */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        <div>
          {loadingMeta ? (
            <div className="h-6 bg-slate-700 rounded w-3/4 animate-pulse mb-2"></div>
          ) : (
            <h3
              className="text-xl font-bold text-white truncate"
              title={metadata?.name}
            >
              {metadata?.name}
            </h3>
          )}
          <a
            href={resolveIPFS(pet.uri)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-secondary hover:underline flex items-center gap-1"
          >
            📄 Ver JSON Metadatos
          </a>
        </div>

        {/* Botón de Estado Perdido */}
        <Button
          variant={pet.isLost ? "success" : "danger"}
          className="w-full text-sm py-1"
          isLoading={actionLoading === "toggling_lost"}
          onClick={handleToggleLost}
        >
          {pet.isLost ? "🔍 Marcar como Encontrado" : "⚠️ Reportar Perdido"}
        </Button>

        <hr className="border-slate-700" />

        {/* Approve Vet Action */}
        <div className="bg-slate-900/50 p-3 rounded-lg space-y-2 border border-slate-700/50">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
            <span>🏥</span> Autorizar Vet
          </label>
          <div className="flex gap-2">
            <input
              className="bg-slate-800 text-white text-xs p-2 rounded w-full border border-slate-700 focus:border-secondary outline-none transition-colors"
              placeholder="Address Vet (0x...)"
              value={approveAddr}
              onChange={(e) => setApproveAddr(e.target.value)}
            />
            <Button
              variant="secondary"
              className="!px-3 !py-1 text-xs whitespace-nowrap"
              isLoading={actionLoading === "approving"}
              onClick={handleApproveVet}
            >
              Aprobar
            </Button>
          </div>
        </div>

        {/* Transfer Action */}
        <div className="bg-slate-900/50 p-3 rounded-lg space-y-2 mt-auto border border-slate-700/50">
          <label className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1">
            <span>🔁</span> Transferir
          </label>
          <div className="flex gap-2">
            <input
              className="bg-slate-800 text-white text-xs p-2 rounded w-full border border-slate-700 focus:border-accent outline-none transition-colors"
              placeholder="Nuevo Dueño (0x...)"
              value={transferAddr}
              onChange={(e) => setTransferAddr(e.target.value)}
            />
            <Button
              variant="danger"
              className="!px-3 !py-1 text-xs whitespace-nowrap"
              isLoading={actionLoading === "transferring"}
              onClick={handleTransfer}
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal ---
export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  nftContract,
  account,
}) => {
  const [pets, setPets] = useState<Animal[]>([]);
  const [searchChipId, setSearchChipId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleAddPet = async () => {
    if (!nftContract || !account || !searchChipId) return;

    if (pets.some((p) => p.tokenId === searchChipId)) {
      setStatusMsg({
        type: "error",
        text: "Esta mascota ya está en tu panel.",
      });
      return;
    }

    setIsSearching(true);
    setStatusMsg(null);

    try {
      const ownerAddress = await nftContract.ownerOf(searchChipId);

      if (ownerAddress.toLowerCase() !== account.toLowerCase()) {
        setStatusMsg({
          type: "error",
          text: "No eres el dueño de este ID de Chip.",
        });
        return;
      }

      const uri = await nftContract.tokenURI(searchChipId);
      const isLost = await nftContract.isLost(searchChipId);

      setPets((prev) => [...prev, { tokenId: searchChipId, uri, isLost }]);
      setStatusMsg({
        type: "success",
        text: `¡Mascota #${searchChipId} agregada con éxito!`,
      });
      setSearchChipId("");
    } catch (error: any) {
      console.error("Error finding pet:", error);
      if (error.reason && error.reason.includes("ERC721NonexistentToken")) {
        setStatusMsg({
          type: "error",
          text: "El ID de Chip no existe en la cadena.",
        });
      } else {
        setStatusMsg({
          type: "error",
          text: "Error al buscar mascota. Revisa el ID o la consola.",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const removePet = (id: string) => {
    setPets((prev) => prev.filter((p) => p.tokenId !== id));
  };

  const updateLostStatus = (id: string, status: boolean) => {
    setPets((prev) =>
      prev.map((p) => (p.tokenId === id ? { ...p, isLost: status } : p))
    );
  };

  return (
    <div className="space-y-8">
      {/* Introduction Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-bold mb-2 text-white">
          🐾 Panel de Mis Mascotas
        </h2>
        <p className="text-slate-400">
          Gestiona tus mascotas registradas. Ingresa el{" "}
          <strong>ID de Chip</strong> proporcionado por tu veterinario para
          cargar el perfil desde IPFS.
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
          <Button
            onClick={handleAddPet}
            isLoading={isSearching}
            className="w-full md:w-auto"
          >
            Agregar al Panel
          </Button>
        </div>
        {statusMsg && (
          <div
            className={`mt-4 p-3 rounded text-sm ${
              statusMsg.type === "error"
                ? "bg-red-500/20 text-red-200"
                : "bg-green-500/20 text-green-200"
            }`}
          >
            {statusMsg.text}
          </div>
        )}
      </div>

      {/* Pet Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Tu Panel ({pets.length})
        </h2>

        {pets.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400">
            <div className="text-4xl mb-4">🐕</div>
            <p className="text-lg">No hay mascotas cargadas aún.</p>
            <p className="text-sm mt-2">
              Ingresa tu ID de Chip arriba para ver tu mascota.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map((pet) => (
              <PetCard
                key={pet.tokenId}
                pet={pet}
                nftContract={nftContract!}
                account={account}
                onRemove={removePet}
                onUpdateLostStatus={updateLostStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
