import React, { useState } from 'react';
import { useBlockchain } from './hooks/useBlockchain';
import { Button } from './components/Button';
import { AdminPanel } from './components/AdminPanel';
import { OwnerDashboard } from './components/OwnerDashboard';
import { VetDashboard } from './components/VetDashboard';
import { ViewState } from './types';

function App() {
  const { 
    account, 
    isConnecting, 
    isConnected, 
    isCorrectNetwork, 
    connectWallet, 
    switchNetwork,
    govContract,
    nftContract,
    storageContract 
  } = useBlockchain();

  const [view, setView] = useState<ViewState>(ViewState.HOME);

  // Render Header
  const renderHeader = () => (
    <nav className="bg-surface border-b border-slate-700 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(ViewState.HOME)}>
        <span className="text-3xl">🩺</span>
        <h1 className="text-xl font-bold text-white tracking-tight">VetChain <span className="text-primary">dApp</span></h1>
      </div>

      <div className="flex items-center gap-4">
        {account && (
          <div className="hidden md:flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs font-mono text-slate-300">
              {isCorrectNetwork ? 'Sepolia' : 'Red Incorrecta'}
            </span>
          </div>
        )}
        
        {!account ? (
          <Button onClick={connectWallet} isLoading={isConnecting}>
            Conectar Wallet
          </Button>
        ) : !isCorrectNetwork ? (
          <Button onClick={switchNetwork} variant="danger">
            Cambiar a Sepolia
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 font-mono hidden sm:inline">
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </span>
            <div className="h-8 w-8 bg-gradient-to-tr from-primary to-accent rounded-full border-2 border-surface shadow-inner"></div>
          </div>
        )}
      </div>
    </nav>
  );

  // Render Role Selection
  const renderRoleSelection = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-4xl font-extrabold text-white mb-6">
        Historia Clínica <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Veterinaria Descentralizada</span>
      </h2>
      <p className="text-slate-400 max-w-lg mb-12 text-lg">
        Gestiona la propiedad de mascotas, rastrea historiales médicos de forma segura y gobierna certificaciones veterinarias en la blockchain.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <button 
          onClick={() => setView(ViewState.OWNER)}
          className="group p-8 bg-slate-800 rounded-2xl border border-slate-700 hover:border-primary hover:bg-slate-800/80 transition-all shadow-xl hover:-translate-y-1"
        >
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🐾</div>
          <h3 className="text-xl font-bold text-white mb-2">Dueño de Mascota</h3>
          <p className="text-sm text-slate-400">Ver mascotas y transferir propiedad.</p>
        </button>

        <button 
          onClick={() => setView(ViewState.VET)}
          className="group p-8 bg-slate-800 rounded-2xl border border-slate-700 hover:border-secondary hover:bg-slate-800/80 transition-all shadow-xl hover:-translate-y-1"
        >
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🩺</div>
          <h3 className="text-xl font-bold text-white mb-2">Veterinario</h3>
          <p className="text-sm text-slate-400">Accede a historiales médicos y registra nuevos tratamientos.</p>
        </button>

        <button 
          onClick={() => setView(ViewState.ADMIN)}
          className="group p-8 bg-slate-800 rounded-2xl border border-slate-700 hover:border-accent hover:bg-slate-800/80 transition-all shadow-xl hover:-translate-y-1"
        >
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚖️</div>
          <h3 className="text-xl font-bold text-white mb-2">Gobernanza</h3>
          <p className="text-sm text-slate-400">Controles de administrador para certificar veterinarios y dueños.</p>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-slate-200 font-sans selection:bg-primary selection:text-white">
      {renderHeader()}

      <main className="container mx-auto px-4 py-8">
        {!account ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-8 text-6xl">🔗</div>
            <h2 className="text-3xl font-bold text-white mb-4">Billetera No Conectada</h2>
            <p className="text-slate-400 mb-8 max-w-md">Por favor conecta tu billetera MetaMask para interactuar con la red de prueba Sepolia.</p>
            <Button onClick={connectWallet} isLoading={isConnecting} className="text-lg px-8 py-3">
              Conectar MetaMask
            </Button>
          </div>
        ) : !isCorrectNetwork ? (
           <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
             <h2 className="text-2xl font-bold text-white mb-4">Red Incorrecta</h2>
             <Button onClick={switchNetwork} variant="danger">Cambiar a Sepolia</Button>
           </div>
        ) : view === ViewState.HOME ? (
          renderRoleSelection()
        ) : (
          <div>
            <button 
              onClick={() => setView(ViewState.HOME)} 
              className="mb-6 text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              ← Volver al Panel
            </button>
            
            {view === ViewState.ADMIN && <AdminPanel govContract={govContract} />}
            {view === ViewState.OWNER && <OwnerDashboard nftContract={nftContract} account={account} />}
            {view === ViewState.VET && <VetDashboard nftContract={nftContract} storageContract={storageContract} />}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;