package com.optimize.elykia.client.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.entities.util.Converter;
import com.optimize.elykia.client.config.ClientAutoInitProperties;
import com.optimize.elykia.client.config.ClientProperties;
import com.optimize.elykia.client.dto.*;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.mapper.ClientMapper;
import com.optimize.elykia.client.repository.ClientRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class ClientService extends GenericService<Client, Long> {
    private final ClientMapper clientMapper;
    private final ClientProperties clientProperties;
    private final ClientAutoInitProperties clientAutoInitProperties;
    private final AccountService accountService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    protected ClientService(ClientRepository repository, ClientMapper clientMapper,
            ClientProperties clientProperties,
            ClientAutoInitProperties clientAutoInitProperties, AccountService accountService,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.clientMapper = clientMapper;
        this.clientProperties = clientProperties;
        this.clientAutoInitProperties = clientAutoInitProperties;
        this.accountService = accountService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Client addClient(ClientDto dto) {
        Client client = clientMapper.toEntity(dto);
        validateClientUniqueness(client); // valitdation
        Client savedClient = create(client);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.client.event.ClientCreatedEvent(
                    this,
                    savedClient.getCollector()));
        }

        return savedClient;
    }

    @Transactional
    public Client updateclient(ClientDto dto, Long clientId) {
        dto.setId(clientId);
        var old = getById(clientId);
        Client client = clientMapper.toEntity(dto);
        if (Objects.isNull(client.getIDDoc())) {
            client.setIDDoc(old.getIDDoc());
        }
        validateClientUniqueness(client); // validation
        return update(client);
    }

    @Transactional
    public Boolean updateClientLocation(LocationUpdate dto) {
        Client client = getById(dto.id());
        client.setLatitude(dto.latitude());
        client.setLongitude(dto.longitude());
        update(client);
        return Boolean.TRUE;
    }

    @Transactional
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
    public Boolean updateClientPhoto(UpdatePhotoDto dto) {
        if (!StringUtils.hasText(dto.cardPhoto()) && !StringUtils.hasText(dto.profilPhoto())) {
            throw new CustomValidationException("vous devez fournir au moins une photo pour la modification !!!");
        }
        Client client = getById(dto.clientId());
        if (StringUtils.hasText(dto.cardPhoto())) {
            client.setProfilPhoto(Converter.convertToByteImage(Objects.requireNonNull(dto.profilPhoto())));
        }
        if (StringUtils.hasText(dto.cardPhoto())) {
            client.setIDDoc(Converter.convertToByteImage(Objects.requireNonNull(dto.cardPhoto())));
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

    // Nouvelle méthode pour lavalidation
    private void validateClientUniqueness(Client client) {
        // Pour une mise à jour, l'ID existe. Pour une création, on utilise 0L pour que
        // la recherche fonctionne.
        Long clientId = (client.getId() != null) ? client.getId() : 0L;

        // Vérification du numéro de téléphone
        if (getRepository().existsByPhoneAndIdNot(client.getPhone(), clientId)) {
            throw new CustomValidationException("Ce numéro de téléphone est déjà utilisé par un autre client.");
        }

        // Vérification du numéro de la pièce d'identité
        if (getRepository().existsByCardIDAndIdNot(client.getCardID(), clientId)) {
            throw new CustomValidationException("Ce numéro de pièce d'identité est déjà utilisé par un autre client.");
        }
    }

    public Page<ClientRespDto> getAll(String username, Boolean tontine, Pageable pageable) {
        if (username != null && username.startsWith("COM")) {
            if (Objects.nonNull(tontine) && tontine) {
                return getRepository().findByTontineCollectorAndClientTypeAndState(username, ClientType.CLIENT, State.ENABLED,
                        pageable);
            }
            return getRepository().findByCollectorAndClientTypeAndState(username, ClientType.CLIENT, State.ENABLED,
                    pageable);
        }
        return getRepository().getByStateNot(State.DELETED, pageable);
    }

    public byte[] getProfilPhoto(Long id) {
        return getRepository().getProfilPhoto(id);
    }

    public byte[] getCardPhoto(Long id) {
        return getRepository().getCardPhoto(id);
    }

    public Page<Client> getByOperator(String username, Pageable pageable) {
        return getRepository().findByCollectorAndCreditInProgressIsTrueAndStateOrderByQuarterAsc(username,
                State.ENABLED, pageable);
    }

    public List<Client> getByCollector(String username) {
        return getRepository().findByCollectorAndCreditInProgressIsTrueAndStateOrderByQuarterAsc(username,
                State.ENABLED);
    }

    public Page<ClientRespDto> getAllClientByCollector(String username, Pageable pageable) {
        return getRepository().findByCollectorAndClientTypeAndState(username, ClientType.CLIENT, State.ENABLED,
                pageable);
    }

    @Transactional
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

    @Override
    public ClientRepository getRepository() {
        return (ClientRepository) repository;
    }
}
