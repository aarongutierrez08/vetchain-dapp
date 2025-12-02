import React, { useState, useEffect } from "react";
import { Contract } from "ethers";

interface MedicalHistoryTableProps {
  tokenId: string;
  storageContract: Contract | null;
}

interface HistoryEvent {
  transactionHash: string;
  timestamp: number;
  vet: string;
  description: string;
  recordType: number;
}

const RECORD_TYPES: {
  [key: number]: { label: string; icon: string; color: string };
} = {
  0: { label: "General", icon: "📝", color: "text-slate-200" },
  1: { label: "Vacuna", icon: "💉", color: "text-green-400" },
  2: { label: "Cirugía", icon: "🏥", color: "text-red-400" },
  3: { label: "Rayos X", icon: "🦴", color: "text-blue-400" },
  4: { label: "Fallecimiento", icon: "💀", color: "text-slate-500" },
};

export const MedicalHistoryTable: React.FC<MedicalHistoryTableProps> = ({
  tokenId,
  storageContract,
}) => {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!storageContract || !tokenId) return;

      setLoading(true);
      try {
        // Filter: MedicalRecordAdded(indexed tokenId, ...)
        // Ethers v6 filter syntax
        const filter = storageContract.filters.MedicalRecordAdded(tokenId);
        const events = await storageContract.queryFilter(filter);

        const parsedEvents: HistoryEvent[] = events.map((e: any) => {
          // Args: [tokenId, timestamp, descriptionIpfs, vet, recordType]
          return {
            transactionHash: e.transactionHash,
            timestamp: Number(e.args[1]),
            description: e.args[2],
            vet: e.args[3],
            recordType: Number(e.args[4]),
          };
        });

        // Sort: Newest first
        parsedEvents.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(parsedEvents);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [tokenId, storageContract]);

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-400 italic">
        Cargando historial clínico...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
        <span className="text-2xl block mb-2">📋</span>
        <p className="text-slate-400">
          Este paciente aún no tiene registros médicos.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-slate-400 text-xs border-b border-slate-700 uppercase tracking-wider">
            <th className="p-3">Fecha</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Descripción</th>
            <th className="p-3">Veterinario</th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-slate-800">
          {history.map((record) => {
            const typeInfo = RECORD_TYPES[record.recordType] || RECORD_TYPES[0];
            const date = new Date(record.timestamp * 1000).toLocaleDateString(
              "es-ES",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            );

            return (
              <tr
                key={record.transactionHash}
                className="hover:bg-slate-800/50 transition-colors"
              >
                <td className="p-3 whitespace-nowrap text-slate-300 font-mono text-xs">
                  {date}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <span
                    className={`flex items-center gap-2 font-semibold ${typeInfo.color}`}
                  >
                    <span>{typeInfo.icon}</span>
                    {typeInfo.label}
                  </span>
                </td>
                <td className="p-3 text-slate-200 max-w-xs break-words">
                  {record.description}
                </td>
                <td
                  className="p-3 whitespace-nowrap font-mono text-xs text-secondary"
                  title={record.vet}
                >
                  {record.vet.substring(0, 6)}...
                  {record.vet.substring(record.vet.length - 4)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
