package com.optimize.elykia.client.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.entities.util.Converter;
import com.optimize.elykia.client.config.ClientCacheNames;
import com.optimize.elykia.client.config.ClientCacheKeyHelper;
import com.optimize.elykia.client.config.EvictClientListCaches;
import com.optimize.elykia.client.config.ClientAutoInitProperties;
import com.optimize.elykia.client.config.ClientProperties;
import com.optimize.elykia.client.dto.*;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.entity.PhotoStore;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.enumeration.PhotoType;
import com.optimize.elykia.client.event.ClientCreatedEvent;
import com.optimize.elykia.client.event.ClientPhoneUpdatedEvent;
import com.optimize.elykia.client.mapper.ClientMapper;
import com.optimize.elykia.client.repository.BusinessCreditAuthorizationEventRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.repository.PhotoStoreRepository;
import com.optimize.elykia.client.enumeration.BusinessCreditAuthorizationAction;
import com.optimize.elykia.client.entity.BusinessCreditAuthorizationEvent;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class ClientService extends GenericService<Client, Long> {
    private final ClientMapper clientMapper;
    private final ClientProperties clientProperties;
    private final ClientAutoInitProperties clientAutoInitProperties;
    private final AccountService accountService;
    private final ApplicationEventPublisher eventPublisher;
    private final PhotoStoreRepository photoStoreRepository;
    private final BusinessCreditAuthorizationEventRepository businessCreditAuthorizationEventRepository;

    protected ClientService(ClientRepository repository, ClientMapper clientMapper,
            ClientProperties clientProperties,
            ClientAutoInitProperties clientAutoInitProperties, AccountService accountService,
            ApplicationEventPublisher eventPublisher,
                            PhotoStoreRepository photoStoreRepository,
                            BusinessCreditAuthorizationEventRepository businessCreditAuthorizationEventRepository) {
        super(repository);
        this.clientMapper = clientMapper;
        this.clientProperties = clientProperties;
        this.clientAutoInitProperties = clientAutoInitProperties;
        this.accountService = accountService;
        this.eventPublisher = eventPublisher;
        this.photoStoreRepository = photoStoreRepository;
        this.businessCreditAuthorizationEventRepository = businessCreditAuthorizationEventRepository;
    }

    @Override
    @Transactional
    public Client update(Client client) {
        if (client.getId() != null) {
            validateClientUniquenessForUpdate(client);
        }
        return super.update(client);
    }

    @Transactional
    @EvictClientListCaches
    public ClientRespDto addClient(ClientDto dto) {
        Client client = clientMapper.toEntity(dto);
        Client existingClient = resolveExistingClientForCreate(client);
        if (existingClient != null) {
            return ClientRespDto.fromClient(existingClient);
        }
        PhotoStore profilPhoto = PhotoStore.buildClientProfil(client);
        PhotoStore cardPhoto = PhotoStore.buildClientCard(client);
        client.removePhotos();
        Client savedClient = create(client);
        profilPhoto.setClientId(savedClient.getId());
        cardPhoto.setClientId(savedClient.getId());
        photoStoreRepository.saveProfilAndCard(profilPhoto, cardPhoto);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new ClientCreatedEvent(
                    this,
                    savedClient.getCollector(),
                    savedClient.getFirstname() + " " + savedClient.getLastname(),
                    savedClient.getId(),
                    savedClient.getPhone()));
        }

        return ClientRespDto.fromClient(savedClient);
    }

    @Transactional
    @EvictClientListCaches
    public ClientRespDto updateClient(ClientDto dto, Long clientId) {
        dto.setId(clientId);
        var old = getById(clientId);
        String oldPhone = old.getPhone();
        Client client = clientMapper.toEntity(dto);
        preservePhotoFields(old, client);
        ClientRespDto result = ClientRespDto.fromClient(update(client));
        publishPhoneUpdatedIfChanged(clientId, oldPhone, client.getPhone());
        return result;
    }

    @Transactional
    @EvictClientListCaches
    public ClientRespDto updateClientInfo(ClientInfoUpdateDto dto) {
        Client client = getById(dto.id());

        if (Boolean.TRUE.equals(client.getCreditInProgress())) {
            boolean firstnameChange = dto.firstname() != null
                    && !Objects.equals(client.getFirstname(), dto.firstname());
            boolean lastnameChange = dto.lastname() != null
                    && !Objects.equals(client.getLastname(), dto.lastname());
            if ((firstnameChange || lastnameChange) && !Boolean.TRUE.equals(dto.allowNameUpdate())) {
                throw new CustomValidationException(
                        "Impossible de modifier le nom d'un client avec un crédit en cours.");
            }
        }

        if (dto.firstname() != null) {
            client.setFirstname(dto.firstname());
        }
        if (dto.lastname() != null) {
            client.setLastname(dto.lastname());
        }
        String oldPhone = client.getPhone();
        client.setAddress(dto.address());
        client.setPhone(dto.phone());
        client.setCardID(dto.cardID());
        client.setCardType(dto.cardType());
        client.setDateOfBirth(dto.dateOfBirth());
        client.setContactPersonName(dto.contactPersonName());
        client.setContactPersonPhone(dto.contactPersonPhone());
        client.setContactPersonAddress(dto.contactPersonAddress());
        client.setQuarter(dto.quarter());
        client.setOccupation(dto.occupation());
        client.setLatitude(dto.latitude());
        client.setLongitude(dto.longitude());
        if (StringUtils.hasText(dto.mll())) {
            client.setMll(dto.mll());
        }

        Client updated = update(client);
        publishPhoneUpdatedIfChanged(client.getId(), oldPhone, updated.getPhone());
        return ClientRespDto.fromClient(updated);
    }

    private void publishPhoneUpdatedIfChanged(Long clientId, String oldPhone, String newPhone) {
        if (eventPublisher != null && oldPhone != null && newPhone != null
                && !Objects.equals(oldPhone, newPhone)) {
            eventPublisher.publishEvent(new ClientPhoneUpdatedEvent(this, clientId, oldPhone, newPhone));
        }
    }

    private void preservePhotoFields(Client old, Client client) {
        
        if (!StringUtils.hasText(client.getProfilPhotoUrl())) {
            client.setProfilPhotoUrl(old.getProfilPhotoUrl());
        }
        if (!StringUtils.hasText(client.getCardPhotoUrl())) {
            client.setCardPhotoUrl(old.getCardPhotoUrl());
        }
        if (!StringUtils.hasText(client.getProfilPhotoThumbUrl())) {
            client.setProfilPhotoThumbUrl(old.getProfilPhotoThumbUrl());
        }
        if (!StringUtils.hasText(client.getCardPhotoThumbUrl())) {
            client.setCardPhotoThumbUrl(old.getCardPhotoThumbUrl());
        }
    }

    private boolean isEmptyBytes(byte[] bytes) {
        return bytes == null || bytes.length == 0;
    }

    @Transactional
    @EvictClientListCaches
    public Boolean updateClientLocation(LocationUpdate dto) {
        Client client = getById(dto.id());
        client.setLatitude(dto.latitude());
        client.setLongitude(dto.longitude());
        update(client);
        return Boolean.TRUE;
    }

    @Transactional
    @EvictClientListCaches
    public Boolean updateClientPhotoUrl(UpdatePhotoUrlDto dto) {
        Client client = getById(dto.id());
        if (StringUtils.hasText(dto.profilPhotoUrl())) {
            client.setProfilPhotoUrl(dto.profilPhotoUrl());
        }
        if (StringUtils.hasText(dto.cardPhotoUrl())) {
            client.setCardPhotoUrl(dto.cardPhotoUrl());
        }
        update(client);
        return Boolean.TRUE;
    }

    @Transactional
    @EvictClientListCaches
    public Boolean updateClientPhoto(UpdatePhotoDto dto) {
        if (!StringUtils.hasText(dto.cardPhoto()) && !StringUtils.hasText(dto.profilPhoto())) {
            throw new CustomValidationException("vous devez fournir au moins une photo pour la modification !!!");
        }
        Client client = getById(dto.clientId());
        if (StringUtils.hasText(dto.profilPhoto())) {
            photoStoreRepository.updateProfil(dto.clientId(), Converter.convertToByteImage(Objects.requireNonNull(dto.profilPhoto())));
        }
        if (StringUtils.hasText(dto.cardPhoto())) {
            photoStoreRepository.updateCard(dto.clientId(), Converter.convertToByteImage(Objects.requireNonNull(dto.cardPhoto())));
        }
        if (StringUtils.hasText(dto.cardType())) {
            client.setCardType(dto.cardType());
        }
        if (StringUtils.hasText(dto.cardNumber())) {
            client.setCardID(dto.cardNumber());
        }

        repository.saveAndFlush(client);

        return Boolean.TRUE;
    }

    @Transactional
    @EvictClientListCaches
    public Boolean updatePhotosBatch(List<ClientPhotoBatchUpdateDto> dtos) {
        for (ClientPhotoBatchUpdateDto dto : dtos) {
            if (StringUtils.hasText(dto.profilPhoto())) {
                photoStoreRepository.updateProfil(dto.clientId(), Converter.convertToByteImage(Objects.requireNonNull(dto.profilPhoto())));
            }
            if (StringUtils.hasText(dto.cardPhoto())) {
                photoStoreRepository.updateCard(dto.clientId(), Converter.convertToByteImage(Objects.requireNonNull(dto.cardPhoto())));
            }
        }
        return Boolean.TRUE;
    }

    public List<ClientPhotoCheckDto> checkMissingPhotos(List<Long> ids) {
        List<ClientPhotoCheckDto> result = new ArrayList<>();

        for (Long id : ids) {
            PhotoStore clientPhoto = photoStoreRepository.getClientProfil(id);
            PhotoStore cardPhoto = photoStoreRepository.getClientCard(id);
            boolean missingProfil = clientPhoto == null || clientPhoto.getPhoto() == null || clientPhoto.getPhoto().length < 512;
            boolean missingCard = cardPhoto == null || cardPhoto.getPhoto() == null || cardPhoto.getPhoto().length < 512;

            if (missingProfil || missingCard) {
                result.add(new ClientPhotoCheckDto(id, missingProfil, missingCard));
            }
        }
        return result;
    }

    /**
     * Création idempotente (sync mobile après timeout) : si un client existe déjà avec le même
     * prénom, nom, téléphone et numéro de pièce, on le renvoie pour permettre au mobile
     * de récupérer l'id serveur. Sinon, lève une {@link CustomValidationException}.
     */
    private Client resolveExistingClientForCreate(Client client) {
        Long excludeId = 0L;
        Client existingByPhone = findConflictingClientByPhone(client.getPhone(), excludeId);
        if (existingByPhone != null) {
            if (hasSameCreateIdentity(existingByPhone, client)) {
                return existingByPhone;
            }
            throw phoneConflictException(existingByPhone);
        }

        Client existingByCard = findConflictingClientByCardId(client.getCardID(), excludeId);
        if (existingByCard != null) {
            if (hasSameCreateIdentity(existingByCard, client)) {
                return existingByCard;
            }
            throw cardIdConflictException(existingByCard);
        }

        return null;
    }

    /**
     * Mise à jour : le téléphone et la pièce d'identité ne doivent appartenir à aucun autre client.
     */
    private void validateClientUniquenessForUpdate(Client client) {
        Long clientId = client.getId();
        Client existingByPhone = findConflictingClientByPhone(client.getPhone(), clientId);
        if (existingByPhone != null) {
            throw phoneConflictException(existingByPhone);
        }

        Client existingByCard = findConflictingClientByCardId(client.getCardID(), clientId);
        if (existingByCard != null) {
            throw cardIdConflictException(existingByCard);
        }
    }

    private Client findConflictingClientByPhone(String phone, Long excludeId) {
        if (!StringUtils.hasText(phone)) {
            return null;
        }
        return getRepository().findByPhoneAndIdNot(phone, excludeId).orElse(null);
    }

    private Client findConflictingClientByCardId(String cardId, Long excludeId) {
        if (!StringUtils.hasText(cardId)) {
            return null;
        }
        return getRepository().findByCardIDAndIdNot(cardId, excludeId).orElse(null);
    }

    private boolean hasSameCreateIdentity(Client existing, Client incoming) {
        return Objects.equals(existing.getFirstname(), incoming.getFirstname())
                && Objects.equals(existing.getLastname(), incoming.getLastname())
                && Objects.equals(existing.getPhone(), incoming.getPhone())
                && Objects.equals(existing.getCardID(), incoming.getCardID());
    }

    private CustomValidationException phoneConflictException(Client conflict) {
        return new CustomValidationException(
                "Ce numéro de téléphone est déjà utilisé par un autre client ("
                        + conflict.getFirstname() + " " + conflict.getLastname()
                        + ") | Commercial associé : " + conflict.getCollector());
    }

    private CustomValidationException cardIdConflictException(Client conflict) {
        return new CustomValidationException(
                "Ce numéro de pièce d'identité est déjà utilisé par un autre client ("
                        + conflict.getFirstname() + " " + conflict.getLastname() + ")");
    }

    @Cacheable(cacheNames = ClientCacheNames.CLIENTS_PAGE, key = "'list-' + T(com.optimize.elykia.client.config.ClientCacheKeyHelper).commercialFilterKey(#username) + '-' + T(java.util.Objects).toString(#tontine, '') + '-' + T(java.util.Objects).toString(#mobile, '') + '-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + T(com.optimize.common.entities.util.PageableCacheKeyHelper).sortKey(#pageable.sort)")
    public Page<ClientRespDto> getAll(String username, Boolean tontine, Boolean mobile, Pageable pageable) {
        return getRepository().findClientsDto(
                ClientCacheKeyHelper.resolveCommercialUsername(username),
                tontine,
                mobile,
                pageable);
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Long> getClientKpis(String username) {
        String effectiveUsername = resolveCommercialUsername(username);
        return java.util.Map.of(
                "totalRegistered", getRepository().countActiveClients(effectiveUsername),
                "withActiveCredit", getRepository().countClientsWithCreditInProgress(effectiveUsername),
                "tontineMembers", getRepository().countTontineMembers(effectiveUsername),
                "withoutCreditNorTontine", getRepository().countClientsWithoutCreditNorTontine(effectiveUsername));
    }

    private String resolveCommercialUsername(String username) {
        return ClientCacheKeyHelper.resolveCommercialUsername(username);
    }

    public byte[] getProfilPhoto(Long id) {
        PhotoStore photo = photoStoreRepository.getClientProfil(id);
        return photo != null ? photo.getPhoto() : null;
    }

    public byte[] getCardPhoto(Long id) {
        return photoStoreRepository.getClientCard(id).getPhoto();
    }

    public List<ClientPhotoDto> getProfilPhotos(List<Long> ids) {
        return photoStoreRepository.getPhotos(ids, PhotoType.PROFIL);
    }

    public List<ClientPhotoDto> getCardPhotos(List<Long> ids) {
        return photoStoreRepository.getPhotos(ids, PhotoType.CARD);
    }

    public Page<Client> getByOperator(String username, Pageable pageable) {
        return getRepository().findByCollectorAndCreditInProgressIsTrueAndStateOrderByQuarterAsc(username,
                State.ENABLED, pageable);
    }

    public List<Client> getByCollector(String username) {
        return getRepository().findByCollectorAndCreditInProgressIsTrueAndStateOrderByQuarterAsc(username,
                State.ENABLED);
    }

    @Cacheable(cacheNames = ClientCacheNames.CLIENTS_BY_COMMERCIAL_PAGE, key = "'commercial-' + #username + '-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + T(com.optimize.common.entities.util.PageableCacheKeyHelper).sortKey(#pageable.sort)")
    public Page<ClientRespDto> getAllClientByCollector(String username, Pageable pageable) {
        return getRepository().findByCollectorAndClientTypeAndState(username, ClientType.CLIENT, State.ENABLED,
                pageable);
    }

    @Transactional
    @EvictClientListCaches
    public Client assignCollector(AssignCollectorDto dto) {
        Client client = getById(dto.getClientId());
        client.setCollector(dto.getCollector());
        return update(client);
    }

    @Transactional
    public Client updateCreditStatus(Long clientId, Boolean status) {
        Client client = getById(clientId);
        client.setCreditInProgress(status);
        return super.update(client);
    }

    @Transactional
    public Client updateBusinessCreditInProgress(Long clientId, Boolean status) {
        Client client = getById(clientId);
        client.setBusinessCreditInProgress(status);
        return super.update(client);
    }

    @Transactional
    public ClientRespDto authorizeBusinessCredit(Long clientId, String performedBy) {
        Client client = getById(clientId);
        if (client.isBusinessCreditAuthorized()) {
            throw new CustomValidationException("Ce client est déjà habilité au crédit business.");
        }
        client.setBusinessCreditAuthorized(true);
        client.setBusinessCreditAuthorizedBy(performedBy);
        client.setBusinessCreditAuthorizedAt(LocalDateTime.now());
        Client saved = super.update(client);
        persistAuthorizationEvent(clientId, BusinessCreditAuthorizationAction.AUTHORIZED, performedBy);
        return ClientRespDto.fromClient(saved);
    }

    @Transactional
    public ClientRespDto revokeBusinessCreditAuthorization(Long clientId, String performedBy) {
        Client client = getById(clientId);
        if (!client.isBusinessCreditAuthorized()) {
            throw new CustomValidationException("Ce client n'est pas habilité au crédit business.");
        }
        client.setBusinessCreditAuthorized(false);
        client.setBusinessCreditAuthorizedBy(null);
        client.setBusinessCreditAuthorizedAt(null);
        Client saved = super.update(client);
        persistAuthorizationEvent(clientId, BusinessCreditAuthorizationAction.REVOKED, performedBy);
        return ClientRespDto.fromClient(saved);
    }

    public List<BusinessCreditAuthorizationEventDto> getBusinessCreditAuthorizationHistory(Long clientId) {
        getById(clientId);
        return businessCreditAuthorizationEventRepository.findByClientIdOrderByPerformedAtDesc(clientId)
                .stream()
                .map(BusinessCreditAuthorizationEventDto::fromEntity)
                .toList();
    }

    private void persistAuthorizationEvent(
            Long clientId, BusinessCreditAuthorizationAction action, String performedBy) {
        BusinessCreditAuthorizationEvent event = new BusinessCreditAuthorizationEvent();
        event.setClientId(clientId);
        event.setAction(action);
        event.setPerformedBy(performedBy);
        event.setPerformedAt(LocalDateTime.now());
        businessCreditAuthorizationEventRepository.save(event);
    }

    @Transactional
    public boolean updateTontineStatus(Long clientId, Boolean status) {
        Client client = getById(clientId);
        client.setTontineMember(status);
        update(client);
        return Boolean.TRUE;
    }

    @Transactional
    public boolean updateOrderStatus(Long clientId, Boolean status) {
        Client client = getById(clientId);
        client.setHasOrderInProgress(status);
        update(client);
        return Boolean.TRUE;
    }

    public Page<Client> elasticsearch(String keyword, String username, Boolean tontine, Pageable pageable) {
        return getRepository().elasticsearch(keyword, username, tontine, pageable);
    }

    @Transactional
    public void initClient() {
        if (clientAutoInitProperties.isEnabled()) {
            clientProperties.getInfo().keySet().forEach(key -> {
                ClientProperties.ClientInfo clientInfo = clientProperties.getInfo().get(key);
                if (!getRepository().existsByFirstnameAndLastname(clientInfo.getFirstname(),
                        clientInfo.getLastname())) {
                    Client client = new Client();
                    client.setFirstname(clientInfo.getFirstname());
                    client.setLastname(clientInfo.getLastname());
                    client.setCollector(clientInfo.getCollector());
                    client.setQuarter(clientInfo.getQuarter());
                    client.setOccupation(clientInfo.getOccupation());
                    client.setClientType(ClientType.valueOf(clientInfo.getType()));
                    client.setAddress(clientInfo.getAddress());
                    client.setPhone(clientInfo.getPhone());
                    client.setCardID(clientInfo.getCardID());
                    client.setDateOfBirth(clientInfo.getDateOfBirth());
                    Account account = new Account();
                    account.setAccountNumber(clientInfo.getAccount().getAccountNumber());
                    account.setAccountBalance(clientInfo.getAccount().getAccountBalance());
                    account.setStatus(AccountStatus.ACTIF);
                    account.setClient(client);
                    client.setAccount(account);
                    repository.saveAndFlush(client);
                }
            });
        }
    }

    @Transactional
    @EvictClientListCaches
    @Override
    public boolean deleteSoft(Long id) throws ApplicationException {
        Client client = getById(id);
        if (Boolean.TRUE.equals(client.getCreditInProgress())) {
            throw new RuntimeException(
                    "Le client a deja une vente à son actif, veuillez supprimer la vente avant de supprimer le client");
        }
        if (client.getAccountId() != null && AccountStatus.ACTIF.equals(client.getAccount().getStatus())) {
            throw new ApplicationException("Supprimer le compte du client avant de supprimer le client");
        } else if (client.getAccountId() != null) {
            accountService.deleteSoft(client.getAccountId());

        }
        return super.deleteSoft(id);
    }

    public byte[] getProfilPhotoStream(Long clientId) {
        PhotoStore photo = photoStoreRepository.getClientProfil(clientId);
        return photo != null ? photo.getPhoto() : null;
    }


    @Transactional
    public void migratePhoto() {
        int page = 0;
        int size = 5;
        Page<Client> clients;
        do {
            clients = getRepository().findAll(Pageable.ofSize(size).withPage(page));
            page++;
            for (Client client : clients) {
                if (!photoStoreRepository.existsByClientId(client.getId())) {
                    PhotoStore profilPhoto = PhotoStore.buildClientProfil(client);
                    PhotoStore cardPhoto = PhotoStore.buildClientCard(client);
                    photoStoreRepository.saveProfilAndCard(profilPhoto, cardPhoto);
                    client.removePhotos();
                    repository.saveAndFlush(client);
                }

            }
        } while (clients.hasNext());
    }

    @Override
    public ClientRepository getRepository() {
        return (ClientRepository) repository;
    }
}
