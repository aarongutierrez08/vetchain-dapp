import React, { useState } from "react";
import { Contract } from "ethers";
import { Input } from "./Input";
import { SmartAddressInput } from "./SmartAddressInput";
import { Button } from "./Button";
import { MedicalHistoryTable } from "./MedicalHistoryTable";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../services/pinataService";

const resolveIPFS = (url: string | undefined): string => {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }
  return url;
};

interface VetDashboardProps {
  nftContract: Contract | null;
  storageContract: Contract | null;
  account: string;
  onBack: () => void;
}

interface PatientMetadata {
  name: string;
  image: string;
  description: string;
}

export const VetDashboard: React.FC<VetDashboardProps> = ({
  nftContract,
  storageContract,
  account,
  onBack,
}) => {
  // --- Registration State ---
  const [regOwnerInput, setRegOwnerInput] = useState("");
  const [regOwnerAddress, setRegOwnerAddress] = useState<string | null>(null);
  const [regChipId, setRegChipId] = useState("");
  const [regName, setRegName] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regImageFile, setRegImageFile] = useState<File | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regStatus, setRegStatus] = useState<string | null>(null);

  // --- Patient Search & Treatment State ---
  const [searchChipId, setSearchChipId] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundPatientId, setFoundPatientId] = useState<string | null>(null);
  const [patientMetadata, setPatientMetadata] =
    useState<PatientMetadata | null>(null);
  const [isDeceased, setIsDeceased] = useState(false); // New Security Check

  // --- Add Record State ---
  const [desc, setDesc] = useState("");
  const [recordType, setRecordType] = useState<number>(0);
  const [daysValid, setDaysValid] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);
  const [recordStatus, setRecordStatus] = useState<string | null>(null);

  // --- Logic: Register ---
  const handleRegisterAnimal = async () => {
    if (!nftContract) return;
    if (
      !regOwnerAddress ||
      !regChipId ||
      !regName ||
      !regBirthDate ||
      !regImageFile
    ) {
      alert("Por favor completa todos los campos.");
      return;
    }

    setIsRegistering(true);
    setRegStatus("Iniciando subida a IPFS...");

    try {
      const imageCid = await uploadFileToIPFS(regImageFile);
      setRegStatus("Imagen subida. Creando metadatos...");

      const metadata = {
        name: regName,
        description: `Mascota registrada con Chip ID: ${regChipId}`,
        image: `ipfs://${imageCid}`,
        attributes: [
          { trait_type: "Birth Date", value: regBirthDate },
          { trait_type: "Chip ID", value: regChipId },
        ],
      };

      const metadataCid = await uploadJSONToIPFS(metadata);
      const tokenUri = `ipfs://${metadataCid}`;

      setRegStatus("Metadatos listos. Confirmando transacción...");

      const birthDateTimestamp = Math.floor(
        new Date(regBirthDate).getTime() / 1000
      );

      const tx = await nftContract.registerAnimal(
        regOwnerAddress,
        regChipId,
        tokenUri,
        birthDateTimestamp
      );
      setRegStatus(`Transacción enviada: ${tx.hash}...`);

      await tx.wait();
      setRegStatus(`¡Éxito! Mascota registrada.`);

      // Clear
      setRegOwnerInput("");
      setRegOwnerAddress(null);
      setRegChipId("");
      setRegName("");
      setRegBirthDate("");
      setRegImageFile(null);
    } catch (error: any) {
      console.error(error);
      setRegStatus(`Error: ${error.reason || error.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  // --- Logic: Search Patient ---
  const handleSearchPatient = async () => {
    if (!nftContract || !searchChipId || !storageContract) return;
    setSearching(true);
    setFoundPatientId(null);
    setPatientMetadata(null);
    setRecordStatus(null);
    setIsDeceased(false);

    try {
      // 1. Verify existence via ownerOf (reverts if nonexistent)
      await nftContract.ownerOf(searchChipId);

      // 2. Fetch Metadata
      const uri = await nftContract.tokenURI(searchChipId);
      const gatewayUrl = resolveIPFS(uri);
      const response = await fetch(gatewayUrl);
      const json = await response.json();

      setPatientMetadata({
        name: json.name,
        image: resolveIPFS(json.image),
        description: json.description,
      });
      setFoundPatientId(searchChipId);

      // 3. Check Deceased Status (Security Check)
      // We query the last MedicalRecordAdded event. If type is 4, it's deceased.
      const filter = storageContract.filters.MedicalRecordAdded(searchChipId);
      const events = await storageContract.queryFilter(filter);
      if (events.length > 0) {
        // Sort to get latest
        const latestEvent: any = events.sort(
          (a: any, b: any) => Number(b.args[1]) - Number(a.args[1])
        )[0];
        if (Number(latestEvent.args[4]) === 4) {
          // 4 = Deceased
          setIsDeceased(true);
        }
      }
    } catch (error: any) {
      console.error(error);
      alert("Paciente no encontrado. Verifica el ID del Chip.");
    } finally {
      setSearching(false);
    }
  };

  // --- Logic: Add Record ---
  const handleAddRecord = async () => {
    if (!nftContract || !foundPatientId) return;
    setIsAdding(true);
    setRecordStatus(null);
    try {
      const tx = await nftContract.addMedicalRecord(
        foundPatientId,
        desc,
        recordType,
        daysValid
      );
      setRecordStatus(`Enviando: ${tx.hash}...`);
      await tx.wait();
      setRecordStatus("¡Historial actualizado correctamente!");

      // Check if we just marked as deceased
      if (recordType === 4) setIsDeceased(true);

      // Reset form
      setDesc("");
      setRecordType(0);
      setDaysValid(0);
    } catch (error: any) {
      console.error(error);
      if (
        error.message.includes("not approved") ||
        error.reason?.includes("not approved") ||
        error.message.includes("ERC721InvalidApprover")
      ) {
        setRecordStatus(
          "⛔ ERROR: No tienes permiso. El dueño debe aprobarte para atender a esta mascota."
        );
      } else {
        setRecordStatus(`Error: ${error.reason || error.message}`);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <span>⬅</span> Volver al Menú
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. Register Patient Column */}
        <div className="bg-surface p-6 rounded-xl shadow-lg border border-slate-700 h-fit">
          <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <span className="text-primary">✚</span> Nuevo Paciente
          </h2>

          {regStatus && (
            <div
              className={`mb-6 p-4 rounded-lg text-sm border ${
                regStatus.includes("Error")
                  ? "bg-red-500/10 border-red-500/50 text-red-200"
                  : "bg-blue-500/10 border-blue-500/50 text-blue-200"
              }`}
            >
              {regStatus}
            </div>
          )}

          <div className="space-y-4">
            <SmartAddressInput
              label="Dueño (Email o Address)"
              value={regOwnerInput}
              onChange={setRegOwnerInput}
              onAddressResolved={setRegOwnerAddress}
            />
            <Input
              label="Chip ID"
              type="number"
              value={regChipId}
              onChange={(e) => setRegChipId(e.target.value)}
            />
            <Input
              label="Nombre"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
            />
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={regBirthDate}
              onChange={(e) => setRegBirthDate(e.target.value)}
            />
            <div className="w-full">
              <label className="text-xs font-medium text-slate-400 mb-1 block">
                Foto
              </label>
              <input
                type="file"
                accept="image/*"
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-primary file:text-white hover:file:bg-indigo-500 w-full"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0])
                    setRegImageFile(e.target.files[0]);
                }}
              />
            </div>
            <Button
              onClick={handleRegisterAnimal}
              isLoading={isRegistering}
              disabled={!regOwnerAddress}
              className="w-full mt-4"
            >
              Registrar Mascota
            </Button>
          </div>
        </div>

        {/* 2. Search & Treat Column */}
        <div className="bg-surface p-6 rounded-xl shadow-lg border border-slate-700 min-h-[500px]">
          <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <span className="text-secondary">🩺</span> Atender Paciente
          </h2>

          <div className="flex gap-2 items-end mb-6">
            <Input
              label="Buscar ID de Chip"
              placeholder="ej. 1001"
              value={searchChipId}
              onChange={(e) => setSearchChipId(e.target.value)}
            />
            <Button
              onClick={handleSearchPatient}
              isLoading={searching}
              variant="secondary"
              className="mb-[1px]"
            >
              Buscar
            </Button>
          </div>

          {foundPatientId && patientMetadata && (
            <div className="animate-fade-in space-y-6">
              {/* Patient Header */}
              <div
                className={`flex gap-4 p-4 rounded-lg border relative overflow-hidden ${
                  isDeceased
                    ? "bg-zinc-900 border-zinc-600"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                <img
                  src={patientMetadata.image}
                  alt="Pet"
                  className={`w-20 h-20 object-cover rounded-full border-2 ${
                    isDeceased
                      ? "border-zinc-500 grayscale"
                      : "border-slate-600"
                  }`}
                />
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {patientMetadata.name}
                  </h3>
                  <span className="text-primary font-mono text-sm">
                    #{foundPatientId}
                  </span>
                </div>
                {isDeceased && (
                  <div className="absolute top-0 right-0 bg-black text-white text-xs font-bold px-3 py-1 border-b border-l border-zinc-600">
                    ⚰️ FALLECIDO
                  </div>
                )}
              </div>

              {/* Medical History */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">
                  Historial Reciente
                </h4>
                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-800 rounded-lg bg-slate-900/50">
                  <MedicalHistoryTable
                    tokenId={foundPatientId}
                    storageContract={storageContract}
                  />
                </div>
              </div>

              {/* Add Record Form */}
              <div className="border-t border-slate-700 pt-6">
                <h4 className="text-lg font-bold text-white mb-4">
                  ✍️ Nuevo Registro
                </h4>

                {isDeceased ? (
                  <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-200 text-center">
                    Este paciente ha fallecido. No se pueden agregar nuevos
                    registros médicos.
                  </div>
                ) : (
                  <>
                    {recordStatus && (
                      <div
                        className={`mb-4 p-3 rounded text-sm ${
                          recordStatus.includes("Error") ||
                          recordStatus.includes("⛔")
                            ? "bg-red-500/20 text-red-200 border border-red-500/30"
                            : "bg-green-500/20 text-green-200"
                        }`}
                      >
                        {recordStatus}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-slate-400 block mb-1">
                            Tipo
                          </label>
                          <select
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                            value={recordType}
                            onChange={(e) =>
                              setRecordType(Number(e.target.value))
                            }
                          >
                            <option value={0}>General</option>
                            <option value={1}>Vacuna</option>
                            <option value={2}>Cirugía</option>
                            <option value={3}>Rayos X</option>
                            <option value={4}>Fallecimiento</option>
                          </select>
                        </div>
                        {recordType === 1 && (
                          <Input
                            label="Validez (Días)"
                            type="number"
                            value={daysValid}
                            onChange={(e) =>
                              setDaysValid(Number(e.target.value))
                            }
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-400 block mb-1">
                          Descripción
                        </label>
                        <textarea
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-primary h-20 resize-none"
                          placeholder="Diagnóstico..."
                          value={desc}
                          onChange={(e) => setDesc(e.target.value)}
                        ></textarea>
                      </div>
                      <Button
                        onClick={handleAddRecord}
                        isLoading={isAdding}
                        className="w-full"
                      >
                        Guardar Registro
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!foundPatientId && !searching && (
            <div className="text-center py-12 text-slate-500">
              Busca un paciente para ver su historia o agregar registros.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
