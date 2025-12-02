import React, { useState, useEffect } from 'react';
import { isAddress } from 'ethers';
import { getAddressByEmail } from '../services/directoryService';

interface SmartAddressInputProps {
  value: string; // El texto que ve el usuario (email o address)
  onChange: (value: string) => void; // Actualiza el texto visual
  onAddressResolved: (address: string | null) => void; // Devuelve la address válida (0x...) al padre
  label?: string;
  placeholder?: string;
  className?: string;
}

export const SmartAddressInput: React.FC<SmartAddressInputProps> = ({
  value,
  onChange,
  onAddressResolved,
  label,
  placeholder = "0x... o email registrado",
  className = ''
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'not-found'>('idle');
  const [resolvedAddr, setResolvedAddr] = useState<string | null>(null);

  useEffect(() => {
    const checkInput = async () => {
      const input = value.trim();

      // 1. Si está vacío
      if (!input) {
        setStatus('idle');
        setResolvedAddr(null);
        onAddressResolved(null);
        return;
      }

      // 2. Si es una dirección Ethereum válida
      if (isAddress(input)) {
        setStatus('success');
        setResolvedAddr(input);
        onAddressResolved(input);
        return;
      }

      // 3. Si parece un email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(input)) {
        setStatus('loading');
        try {
          const addr = await getAddressByEmail(input);
          if (addr) {
            setStatus('success');
            setResolvedAddr(addr);
            onAddressResolved(addr);
          } else {
            setStatus('not-found');
            setResolvedAddr(null);
            onAddressResolved(null);
          }
        } catch (error) {
          setStatus('error');
          setResolvedAddr(null);
          onAddressResolved(null);
        }
        return;
      }

      // 4. Si no es ni dirección ni email válido (aún escribiendo)
      setStatus('idle');
      setResolvedAddr(null);
      onAddressResolved(null);
    };

    // Debounce simple para no llamar a Firebase en cada tecla
    const timeoutId = setTimeout(checkInput, 500);
    return () => clearTimeout(timeoutId);

  }, [value, onAddressResolved]);

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-400">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-slate-800 border ${
            status === 'error' || status === 'not-found' ? 'border-red-500' : 
            status === 'success' ? 'border-green-500' : 'border-slate-700'
          } text-white rounded-lg pl-4 pr-10 py-2 focus:ring-2 focus:ring-primary outline-none transition-all placeholder-slate-500 font-mono text-sm`}
        />
        
        {/* Status Indicator Icon */}
        <div className="absolute right-3 top-2.5">
          {status === 'loading' && (
            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {status === 'success' && <span title="Dirección válida encontrada">✅</span>}
          {status === 'not-found' && <span title="Email no encontrado">❌</span>}
          {status === 'error' && <span title="Error de red">⚠️</span>}
        </div>
      </div>

      {/* Helper Text */}
      {status === 'success' && resolvedAddr && !isAddress(value) && (
        <div className="text-xs text-green-400 font-mono bg-green-900/20 p-1 rounded px-2">
          Resuelto: {resolvedAddr.substring(0, 8)}...{resolvedAddr.substring(resolvedAddr.length - 6)}
        </div>
      )}
      {status === 'not-found' && (
        <span className="text-xs text-red-400">Email no registrado en VetChain</span>
      )}
    </div>
  );
};