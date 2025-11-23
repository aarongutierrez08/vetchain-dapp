# 🐾 VetChain - Registro Clínico Veterinario Descentralizado

Este proyecto es una **dApp (Aplicación Descentralizada)** construida sobre la red de pruebas **Sepolia (Ethereum)** que permite gestionar la identidad, propiedad e historial médico de animales de compañía mediante tecnología Blockchain.

El sistema garantiza la inmutabilidad de los historiales médicos, certifica a los veterinarios y asegura transferencias de mascotas bajo reglas estrictas de sanidad.

## 🚀 Características Principales

* **Identidad Soberana (ERC-721):** Cada animal es representado como un NFT único donde el `TokenID` corresponde al **número de Chip físico**.
* **Gobernanza Veterinaria:** Solo veterinarios certificados por el administrador pueden registrar animales y firmar historiales médicos.
* **Historial Médico Inmutable:** Los diagnósticos y vacunas se almacenan permanentemente. Los archivos extensos se gestionan vía **IPFS** para eficiencia de gas.
* **Privacidad y Permisos:** Un veterinario solo puede escribir en el historial de un animal si el dueño lo autoriza explícitamente (`approveVet`).
* **Transferencia Condicional (Smart Logic):** El Smart Contract bloquea la transferencia del animal a un nuevo dueño si:
    1.  El animal no está vacunado (`isVaccinated == false`).
    2.  El nuevo dueño no ha sido marcado como "Apto" por la gobernanza.

## 🏗 Arquitectura de Smart Contracts

El sistema es modular y consta de 3 contratos interconectados:

1.  **`VeterinaryGovernance.sol`**: Control de acceso (RBAC). Gestiona la lista blanca de Veterinarios autorizados y Dueños aptos.
2.  **`AnimalNFT.sol`**: El núcleo del sistema. Maneja la creación (registro por veterinario), propiedad y lógica de transferencia del token.
3.  **`MedicalStorage.sol`**: Base de datos en cadena. Almacena los registros médicos y estados de vacunación. Solo el contrato NFT tiene permisos de escritura aquí.

## 🛠 Tech Stack

* **Blockchain:** Solidity (Ethereum / Sepolia Testnet).
* **Frontend:** React + Vite.
* **Lenguaje:** TypeScript.
* **Estilos:** TailwindCSS.
* **Librería Web3:** Ethers.js v6.
* **Almacenamiento:** IPFS (vía Pinata) para metadatos y fichas médicas.
* **Herramientas:** Remix IDE, MetaMask.
