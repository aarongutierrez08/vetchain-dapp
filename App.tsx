import React, { useState, useEffect } from "react";
import { useBlockchain } from "./hooks/useBlockchain";
import { Button } from "./components/Button";
import { Input } from "./components/Input";
import { OwnerDashboard } from "./components/OwnerDashboard";
import { VetDashboard } from "./components/VetDashboard";
import {
  linkEmailToAddress,
  getEmailByAddress,
} from "./services/directoryService";

type ViewMode =
  | "HOME"
  | "VET_LINK_LICENSE"
  | "VET_DASHBOARD"
  | "OWNER_DASHBOARD";

function App() {
  const {
    account,
    isConnecting,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
    nftContract,
    storageContract,
    checkVetLicense,
  } = useBlockchain();

  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>("HOME");

  // Identity State
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [linkingEmail, setLinkingEmail] = useState(false);

  // Vet Linking State
  const [licenseInput, setLicenseInput] = useState("");
  const [linkingLicense, setLinkingLicense] = useState(false);

  // 1. On Connect: Fetch Email Identity
  useEffect(() => {
    const fetchIdentity = async () => {
      if (account) {
        const email = await getEmailByAddress(account);
        setCurrentEmail(email);
        setViewMode("HOME"); // Reset view on account change
      } else {
        setCurrentEmail(null);
        setViewMode("HOME");
      }
    };
    fetchIdentity();
  }, [account]);

  // Logic: Handle Vet Selection
  const handleVetClick = async () => {
    if (!nftContract || !account) return;
    try {
      const licenseId = await checkVetLicense(account, nftContract);
      if (licenseId > 0n) {
        setViewMode("VET_DASHBOARD");
      } else {
        setViewMode("VET_LINK_LICENSE");
      }
    } catch (e) {
      console.error(e);
      alert("Error verificando licencia. Asegúrate de estar en Sepolia.");
    }
  };

  // Logic: Handle Owner Selection
  const handleOwnerClick = () => {
    setViewMode("OWNER_DASHBOARD");
  };

  // Logic: Link Email
  const handleLinkEmail = async () => {
    if (!account || !emailInput) return;
    setLinkingEmail(true);
    try {
      await linkEmailToAddress(emailInput, account);
      setCurrentEmail(emailInput);
      setShowEmailModal(false);
      setEmailInput("");
      alert("¡Email vinculado correctamente!");
    } catch (e) {
      alert("Error al vincular email.");
    } finally {
      setLinkingEmail(false);
    }
  };

  // Logic: Link Vet License
  const handleLinkLicense = async () => {
    if (!nftContract || !licenseInput) return;
    setLinkingLicense(true);
    try {
      const tx = await nftContract.linkVetLicense(licenseInput);
      await tx.wait();
      alert("Licencia vinculada. ¡Bienvenido!");
      setViewMode("VET_DASHBOARD");
    } catch (e: any) {
      alert(`Error: ${e.reason || e.message}`);
    } finally {
      setLinkingLicense(false);
    }
  };

  // --- RENDERERS ---

  const renderHeader = () => (
    <nav className="bg-surface border-b border-slate-700 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 shadow-md">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setViewMode("HOME")}
      >
        <span className="text-3xl">🩺</span>
        <h1 className="text-xl font-bold text-white tracking-tight">
          VetChain
        </h1>
      </div>

      {account ? (
        <div className="flex items-center gap-6">
          {/* Role & Email Display */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              {viewMode === "VET_DASHBOARD" && (
                <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded font-bold border border-primary/30">
                  MODO VETERINARIO
                </span>
              )}
              {viewMode === "OWNER_DASHBOARD" && (
                <span className="bg-secondary/20 text-secondary text-xs px-2 py-0.5 rounded font-bold border border-secondary/30">
                  MODO DUEÑO
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm mt-0.5">
              <span
                className={
                  currentEmail ? "text-white" : "text-slate-500 italic"
                }
              >
                {currentEmail || "Sin email vinculado"}
              </span>
              <button
                onClick={() => setShowEmailModal(true)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                {currentEmail ? "Editar" : "Vincular"}
              </button>
            </div>
          </div>
          {/* Wallet Address */}
          <div className="hidden md:block text-right">
            <span className="text-xs text-slate-400 font-mono block">
              Wallet Conectada
            </span>
            <span className="text-xs text-slate-300 font-mono">
              {account.substring(0, 6)}...
              {account.substring(account.length - 4)}
            </span>
          </div>
          <div className="h-8 w-8 bg-gradient-to-tr from-primary to-accent rounded-full border-2 border-surface shadow-inner"></div>
        </div>
      ) : (
        <Button onClick={connectWallet} isLoading={isConnecting}>
          Conectar Wallet
        </Button>
      )}
    </nav>
  );

  const renderContent = () => {
    // 1. Not Connected
    if (!account) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
          <div className="mb-8 text-7xl">🐕</div>
          <h2 className="text-4xl font-bold text-white mb-6">
            Bienvenido a VetChain
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg text-lg">
            La plataforma descentralizada para la gestión de historiales
            clínicos veterinarios. Seguridad, transparencia y control total para
            dueños y profesionales.
          </p>
          <Button
            onClick={connectWallet}
            isLoading={isConnecting}
            className="text-lg px-8 py-3 shadow-xl shadow-primary/20"
          >
            Conectar MetaMask para Iniciar
          </Button>
        </div>
      );
    }

    // 2. Wrong Network
    if (!isCorrectNetwork) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Red Incorrecta</h2>
          <p className="text-slate-400 mb-6">
            Esta dApp funciona exclusivamente en la red Sepolia.
          </p>
          <Button onClick={switchNetwork} variant="danger">
            Cambiar a Sepolia
          </Button>
        </div>
      );
    }

    // 3. Router Switch
    switch (viewMode) {
      case "HOME":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-8">
              ¿Cómo deseas ingresar hoy?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
              {/* Vet Card */}
              <div
                onClick={handleVetClick}
                className="bg-surface p-8 rounded-2xl border border-slate-700 hover:border-primary hover:bg-slate-800/80 transition-all cursor-pointer group flex flex-col items-center shadow-lg"
              >
                <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  🩺
                </span>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Soy Veterinario
                </h3>
                <p className="text-slate-400 text-sm">
                  Accede para registrar pacientes, ver historiales y gestionar
                  tratamientos.
                </p>
              </div>

              {/* Owner Card */}
              <div
                onClick={handleOwnerClick}
                className="bg-surface p-8 rounded-2xl border border-slate-700 hover:border-secondary hover:bg-slate-800/80 transition-all cursor-pointer group flex flex-col items-center shadow-lg"
              >
                <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  🐾
                </span>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Soy Dueño
                </h3>
                <p className="text-slate-400 text-sm">
                  Gestiona tus mascotas, autoriza profesionales y transfiere la
                  propiedad.
                </p>
              </div>
            </div>
          </div>
        );

      case "VET_LINK_LICENSE":
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in bg-surface p-8 rounded-xl shadow-2xl border border-slate-700 max-w-md mx-auto mt-10">
            <button
              onClick={() => setViewMode("HOME")}
              className="self-start text-slate-500 hover:text-white mb-4"
            >
              ← Cancelar
            </button>
            <h2 className="text-3xl font-bold text-white mb-2">
              Registro Profesional
            </h2>
            <p className="text-slate-400 text-center mb-6 text-sm">
              No detectamos una licencia vinculada a tu wallet. Por favor
              ingresa el ID de tu NFT de Licencia para continuar.
            </p>

            <div className="w-full space-y-4">
              <Input
                label="ID de Licencia (Token ID)"
                placeholder="Ej. 105"
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
              />
              <Button
                onClick={handleLinkLicense}
                isLoading={linkingLicense}
                className="w-full"
              >
                Vincular Licencia
              </Button>
            </div>
          </div>
        );

      case "VET_DASHBOARD":
        return (
          <VetDashboard
            nftContract={nftContract}
            storageContract={storageContract}
            account={account}
            onBack={() => setViewMode("HOME")}
          />
        );

      case "OWNER_DASHBOARD":
        return (
          <OwnerDashboard
            nftContract={nftContract}
            storageContract={storageContract}
            account={account}
            onBack={() => setViewMode("HOME")}
          />
        );

      default:
        return <div>Error: Vista no encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-200 font-sans selection:bg-primary selection:text-white">
      {renderHeader()}

      <main className="container mx-auto px-4 py-8">{renderContent()}</main>

      {/* Email Linking Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              Vincular Identidad
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Asocia un email a tu wallet ({account?.substring(0, 6)}...) para
              que otros usuarios puedan encontrarte fácilmente.
            </p>
            <Input
              placeholder="tu@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowEmailModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleLinkEmail} isLoading={linkingEmail}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
