// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Enum idéntico al del NFT para consistencia en los tipos de registros.
enum RecordType {
    GENERAL,
    VACCINE,
    SURGERY,
    XRAY,
    DECEASED
}

/// @title MedicalStorage - Base de Datos Clínica Inmutable
/// @notice Almacena datos críticos on-chain y emite eventos para construir el historial médico off-chain.
/// @dev Este contrato es pasivo: solo acepta escrituras del contrato "Controller" (AnimalNFT).
contract MedicalStorage is Ownable {
    /// @notice Almacena la fecha de vencimiento de la vacuna vigente por TokenID.
    mapping(uint256 => uint256) public vaccineExpiration;

    /// @notice Almacena la fecha de nacimiento (inmutable) por TokenID.
    mapping(uint256 => uint256) public birthDates;

    /// @notice Dirección del contrato AnimalNFT autorizado para escribir.
    address public controllerContract;

    /// @notice Evento principal para reconstruir la historia clínica en el Frontend.
    /// @dev Se usa LOGS en lugar de Arrays en memoria para reducir costos de gas (~90% ahorro).
    event MedicalRecordAdded(
        uint256 indexed tokenId,
        uint256 timestamp,
        string descriptionIpfs, // Hash del documento en IPFS
        address indexed vet,
        RecordType recordType
    );

    constructor() Ownable(msg.sender) {}

    /// @dev Restringe la llamada solo a la dirección del controlador configurado.
    modifier onlyController() {
        require(
            msg.sender == controllerContract,
            "No autorizado: Solo el contrato Controlador puede escribir"
        );
        _;
    }

    /// @notice Configura qué contrato tiene permiso de escritura (AnimalNFT).
    /// @dev Solo el admin (deployer) puede cambiar esto en caso de actualización del NFT.
    function setController(address _controller) external onlyOwner {
        controllerContract = _controller;
    }

    /// @notice Guarda la fecha de nacimiento.
    /// @dev Solo se llama una vez al momento del registro (mint).
    function setBirthDate(
        uint256 _tokenId,
        uint256 _birthDate
    ) external onlyController {
        birthDates[_tokenId] = _birthDate;
    }

    /// @notice Escribe un nuevo evento médico y actualiza estados lógicos si es necesario.
    /// @param _tokenId ID del animal.
    /// @param _ipfsHash CID de IPFS con el detalle médico.
    /// @param _vet Dirección del veterinario que firma.
    /// @param _type Tipo de registro.
    /// @param _daysValid Días de vigencia (solo si es vacuna).
    function addEntry(
        uint256 _tokenId,
        string memory _ipfsHash,
        address _vet,
        RecordType _type,
        uint256 _daysValid
    ) external onlyController {
        // 1. Lógica Crítica On-Chain (Se guarda en Storage - Costoso pero necesario para reglas)
        // Si es una vacuna, calculamos y guardamos la fecha de expiración.
        if (_type == RecordType.VACCINE) {
            vaccineExpiration[_tokenId] =
                block.timestamp +
                (_daysValid * 1 days);
        }

        // 2. Historial Informativo (Se emite como Evento - Barato)
        // Emitimos el evento para que la dApp lo indexe y muestre.
        emit MedicalRecordAdded(
            _tokenId,
            block.timestamp,
            _ipfsHash,
            _vet,
            _type
        );
    }

    /// @notice Verifica si la vacuna del animal está vigente al día de hoy.
    /// @return bool True si la fecha actual es menor a la fecha de vencimiento.
    function isVaccineValid(uint256 _tokenId) external view returns (bool) {
        return block.timestamp < vaccineExpiration[_tokenId];
    }

    /// @notice Devuelve la fecha de nacimiento del animal.
    function getBirthDate(uint256 _tokenId) external view returns (uint256) {
        return birthDates[_tokenId];
    }
}
