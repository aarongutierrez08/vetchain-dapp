
import React, { useState } from 'react';
import { isAddress } from 'ethers';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export const AddressInput: React.FC<AddressInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "0x...", 
  label,
  className = '' 
}) => {
  const [isValid, setIsValid] = useState(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    // Validate on type if not empty
    setIsValid(val === '' || isAddress(val));
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text);
        setIsValid(isAddress(text));
      }
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
          className={`w-full bg-slate-800 border ${isValid ? 'border-slate-700 focus:ring-primary' : 'border-red-500 focus:ring-red-500'} text-white rounded-lg pl-4 pr-12 py-2 focus:ring-2 outline-none transition-all placeholder-slate-500 font-mono text-sm`}
        />
        <button
          type="button"
          onClick={handlePaste}
          title="Pegar del portapapeles"
          className="absolute right-2 p-1.5 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
        </button>
      </div>
      {!isValid && <span className="text-xs text-red-400">Dirección Ethereum inválida</span>}
    </div>
  );
};
