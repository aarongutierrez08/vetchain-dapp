// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @notice Tipos de registros médicos disponibles para clasificar eventos clínicos.
enum RecordType {
    GENERAL,
    VACCINE,
    SURGERY,
    XRAY,
    DECEASED
}

// Interface del contrato externo de Registro de Licencias
interface IVetLicenseRegistry {
    function isValid(uint256 tokenId) external view returns (bool);
}

// Interface del contrato de Almacenamiento Médico
interface IStorage {
    function addEntry(
        uint256 _tokenId,
        string memory _desc,
        address _vet,
        RecordType _type,
        uint256 _daysValid
    ) external;
    function isVaccineValid(uint256 _tokenId) external view returns (bool);
    function setBirthDate(uint256 _tokenId, uint256 _birthDate) external;
    function getBirthDate(uint256 _tokenId) external view returns (uint256);
}

/// @title AnimalNFT - Identidad Digital Soberana para Mascotas (v4)
/// @notice Gestiona la creación, propiedad y transferencia de animales representados como NFTs.
/// @dev Implementa lógica de seguridad vinculada a licencias veterinarias externas y reglas de negocio sanitarias.
contract AnimalNFT is ERC721, ERC721URIStorage, Ownable {
    // --- VARIABLES DE ESTADO Y REFERENCIAS ---

    /// @notice Contrato externo que valida si una licencia está vigente.
    IVetLicenseRegistry public vetRegistry;

    /// @notice Contrato NFT externo que emite las licencias veterinarias.
    IERC721 public vetNftContract;

    /// @notice Contrato donde se almacenan los datos clínicos persistentes.
    IStorage public medicalStorage;

    /// @dev Contador de propiedad (Nonce) para invalidar permisos al transferir.
    mapping(uint256 => uint256) private _tokenNonce;

    /// @dev Almacena aprobaciones temporales: TokenID => VetAddress => Nonce.
    mapping(uint256 => mapping(address => uint256)) private _vetApprovalNonce;

    /// @notice Estado de extravío del animal. Si es true, el animal está bloqueado.
    mapping(uint256 => bool) public isLost;

    /// @notice Vinculación entre la wallet del veterinario y su Token ID de Licencia profesional.
    mapping(address => uint256) public vetWalletToLicenseId;

    // --- EVENTOS ---

    /// @notice Se emite cuando un dueño reporta a su mascota como perdida o encontrada.
    event AnimalReportedLost(uint256 indexed tokenId, bool status);

    /// @notice Se emite cuando un animal fallece y el token es quemado.
    event AnimalDeceased(
        uint256 indexed tokenId,
        string finalUri,
        uint256 deathDate
    );

    /// @notice Se emite cuando un veterinario vincula exitosamente su wallet con su licencia.
    event VetLinked(address indexed vet, uint256 licenseId);

    /// @param _vetRegistryAddress Dirección del contrato de registro de licencias.
    /// @param _vetNftAddress Dirección del contrato NFT de licencias.
    /// @param _storageAddress Dirección del contrato MedicalStorage.
    constructor(
        address _vetRegistryAddress,
        address _vetNftAddress,
        address _storageAddress
    ) ERC721("VetChain", "VET") Ownable(msg.sender) {
        vetRegistry = IVetLicenseRegistry(_vetRegistryAddress);
        vetNftContract = IERC721(_vetNftAddress);
        medicalStorage = IStorage(_storageAddress);
    }

    /// @notice Permite a un veterinario vincular su wallet con su NFT de licencia profesional.
    /// @dev Verifica propiedad del NFT en el contrato externo y validez en el registro.
    /// @param _licenseId El ID del Token de la licencia (NFT) que posee el veterinario.
    /// Provisorio
    function linkVetLicense(uint256 _licenseId) public {
        // 1. Verificamos que realmente tenga el NFT de esa licencia
        require(
            vetNftContract.ownerOf(_licenseId) == msg.sender,
            "No posees el NFT de esta licencia"
        );

        // 2. Verificamos que la licencia esté activa en el registro
        require(
            vetRegistry.isValid(_licenseId),
            "Licencia invalida, vencida o revocada"
        );

        // 3. Vinculamos
        vetWalletToLicenseId[msg.sender] = _licenseId;
        emit VetLinked(msg.sender, _licenseId);
    }

    /// @dev Modificador que restringe funciones solo a veterinarios con licencia válida y vigente en el momento de la llamada.
    /// Solo quedarnos con esa validación.
    modifier onlyValidVet() {
        uint256 licenseId = vetWalletToLicenseId[msg.sender];
        require(
            licenseId != 0,
            "No has vinculado ninguna licencia. Usa linkVetLicense()"
        );

        // Re-verificamos propiedad (por si no tiene más el NFT)
        require(
            vetNftContract.ownerOf(licenseId) == msg.sender,
            "Ya no posees el NFT de licencia"
        );

        // Re-verificamos validez (por si caducó)
        require(
            vetRegistry.isValid(licenseId),
            "Tu licencia ha caducado o fue revocada"
        );
        _;
    }

    // --- FUNCIONES CORE ---

    /// @notice Registra un nuevo animal en el sistema (Minting).
    /// @dev Solo veterinarios validados pueden ejecutarlo. Inicializa el nonce en 1.
    /// @param _toOwner Dirección del dueño inicial de la mascota.
    /// @param _chipId ID del microchip físico (será el TokenID).
    /// @param _uri Enlace IPFS con los metadatos visuales (foto, nombre).
    /// @param _birthDate Fecha de nacimiento en Unix Timestamp.
    function registerAnimal(
        address _toOwner,
        uint256 _chipId,
        string memory _uri,
        uint256 _birthDate
    ) public onlyValidVet {
        medicalStorage.setBirthDate(_chipId, _birthDate);
        _tokenNonce[_chipId] = 1;
        _safeMint(_toOwner, _chipId);
        _setTokenURI(_chipId, _uri);
    }

    /// @notice Agrega un registro al historial clínico.
    /// @dev Requiere que el animal exista, el vet esté validado y tenga permiso explícito del dueño. Consume el permiso al finalizar.
    /// @param _tokenId ID del animal.
    /// @param _desc Hash IPFS o descripción corta del diagnóstico.
    /// @param _type Tipo de evento (Vacuna, Cirugía, etc.).
    /// @param _daysValid Días de validez (solo relevante para vacunas).
    function addMedicalRecord(
        uint256 _tokenId,
        string memory _desc,
        RecordType _type,
        uint256 _daysValid
    ) public onlyValidVet {
        require(exists(_tokenId), "El animal no existe o fallecio");
        require(
            _vetApprovalNonce[_tokenId][msg.sender] == _tokenNonce[_tokenId],
            "Permiso del dueno requerido"
        );

        medicalStorage.addEntry(_tokenId, _desc, msg.sender, _type, _daysValid);

        // Revocación automática del permiso tras el uso
        delete _vetApprovalNonce[_tokenId][msg.sender];
    }

    /// @notice Registra el fallecimiento de un animal y destruye el token digital.
    /// @dev Quema (_burn) el token para impedir transferencias futuras pero guarda el historial.
    /// @param _tokenId ID del animal.
    /// @param _deathCertificateHash Hash IPFS del certificado de defunción.
    function reportDecease(
        uint256 _tokenId,
        string memory _deathCertificateHash
    ) public onlyValidVet {
        // Guardar registro final
        medicalStorage.addEntry(
            _tokenId,
            _deathCertificateHash,
            msg.sender,
            RecordType.DECEASED,
            0
        );

        // Guardar URI para el evento antes de quemar
        string memory finalUri = tokenURI(_tokenId);
        emit AnimalDeceased(_tokenId, finalUri, block.timestamp);

        _burn(_tokenId);
    }

    // --- LÓGICA DE TRANSFERENCIA Y REGLAS DE NEGOCIO ---

    /// @dev Hook interno de OpenZeppelin que se ejecuta antes de cualquier transferencia (incluyendo mint y burn).
    /// @notice Aplica las reglas sanitarias: Vacunación, Estado de Extravío y Edad Mínima.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);

        // Si no es mint (from!=0) y no es burn (to!=0), es una transferencia real.
        if (from != address(0) && to != address(0)) {
            // Regla 1: Vacunas al día
            require(
                medicalStorage.isVaccineValid(tokenId),
                "Bloqueo: Vacuna vencida"
            );
            // Regla 2: No estar reportado como perdido
            require(!isLost[tokenId], "Bloqueo: Animal reportado como PERDIDO");

            // Regla 3: Edad mínima de destete (60 días)
            uint256 birth = medicalStorage.getBirthDate(tokenId);
            if (birth > 0) {
                require(
                    block.timestamp >= birth + 60 days,
                    "Bloqueo: Animal menor a 60 dias"
                );
            }
        }

        // Si cambia de dueño, incrementamos el nonce para invalidar permisos anteriores
        if (from != address(0)) {
            _tokenNonce[tokenId]++;
        }

        return super._update(to, tokenId, auth);
    }

    // --- FUNCIONES DE DUEÑO ---

    /// @notice Reporta al animal como perdido o encontrado.
    /// @dev Bloquea transferencias si _status es true.
    function setLostStatus(uint256 _tokenId, bool _status) public {
        require(ownerOf(_tokenId) == msg.sender, "No eres el dueno");
        require(exists(_tokenId), "El animal no existe o fallecio");
        isLost[_tokenId] = _status;
        emit AnimalReportedLost(_tokenId, _status);
    }

    /// @notice Autoriza a un veterinario para escribir en el historial de ESTE animal.
    /// @dev El permiso se vincula al nonce actual. Si el animal se transfiere, el permiso caduca.
    /// @param _vet Dirección del veterinario.
    /// @param _tokenId ID del animal.
    function approveVet(address _vet, uint256 _tokenId) public {
        require(ownerOf(_tokenId) == msg.sender, "No eres el dueno");
        // Nota: No validamos licencia aquí para ahorrar gas al dueño, se valida al intentar escribir.
        _vetApprovalNonce[_tokenId][_vet] = _tokenNonce[_tokenId];
    }

    // --- OVERRIDES OBLIGATORIOS (ERC721URIStorage) ---

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Helper para verificar si un token existe y tiene dueño (no quemado).
    function exists(uint256 tokenId) public view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
