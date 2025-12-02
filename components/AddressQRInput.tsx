import React, { useState, useEffect, useRef } from 'react';
import { isAddress } from 'ethers';

// Global declaration for Html5QrcodeScanner loaded via script tag
declare global {
  interface Window {
    Html5QrcodeScanner: any;
  }
}

interface AddressQRInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export const AddressQRInput: React.FC<AddressQRInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "0x...", 
  label,
  className = '' 
}) => {
  const [isValid, setIsValid] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    setIsValid(value === '' || isAddress(value));
  }, [value]);

  useEffect(() => {
    if (showScanner && window.Html5QrcodeScanner) {
      // Small timeout to ensure DOM element is ready
      const timer = setTimeout(() => {
        const scanner = new window.Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText: string) => {
            // Explicitly cast to string to fix TS error in the else branch logic
            const rawText = String(decodedText);

            // Success: detected address
            if (isAddress(rawText)) {
              onChange(rawText);
              setIsValid(true);
              handleStopScan();
            } else {
              // isAddress acts as a type guard (value is string), so when false, TS infers rawText is never (Exclude<string, string>).
              // We cast back to string to proceed.
              const textToCheck = rawText as string;

              // Maybe it's a URI like ethereum:0x...?
              if (textToCheck.startsWith("ethereum:")) {
                const parts = textToCheck.split(":");
                // parts[1] might be the address
                if (parts[1] && isAddress(parts[1])) {
                   onChange(parts[1]);
                   setIsValid(true);
                   handleStopScan();
                   return;
                }
              }
              // Don't alert immediately on every frame, just log or ignore if not valid
              // alert("QR detectado no es una dirección válida."); 
            }
          }, 
          (error: any) => {
            // Ignore parse errors, scanning is continuous
          }
        );
        scannerRef.current = scanner;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showScanner]);

  const handleStopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch((err: any) => console.error(err));
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text);
    } catch (err) {
      console.error("Failed to read clipboard", err);
    }
  };

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-400">{label}</label>}
      
      <div className="relative flex items-center">
        <input 
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full bg-slate-800 border ${isValid ? 'border-slate-700 focus:ring-primary' : 'border-red-500 focus:ring-red-500'} text-white rounded-lg pl-4 pr-20 py-2 focus:ring-2 outline-none transition-all placeholder-slate-500 font-mono text-sm`}
        />
        
        <div className="absolute right-2 flex gap-1">
           <button
            type="button"
            onClick={handlePaste}
            title="Pegar del portapapeles"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            📋
          </button>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            title="Escanear QR"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            📷
          </button>
        </div>
      </div>
      
      {!isValid && <span className="text-xs text-red-400">Dirección Ethereum inválida</span>}

      {/* QR Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md relative shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 text-center">Escanear Dirección</h3>
            <div id="qr-reader" className="w-full overflow-hidden rounded-lg bg-black"></div>
            <button 
              onClick={handleStopScan}
              className="mt-6 w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};