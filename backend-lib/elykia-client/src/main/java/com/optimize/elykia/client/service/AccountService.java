package com.optimize.elykia.client.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.client.dto.AccountDto;
import com.optimize.elykia.client.dto.AccountKpiDto;
import com.optimize.elykia.client.dto.AccountRespDto;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.mapper.AccountMapper;
import com.optimize.elykia.client.repository.AccountRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import jakarta.persistence.EntityManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Objects;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
@Slf4j
public class AccountService extends GenericService<Account, Long> {
    private final AccountMapper accountMapper;

    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final ClientRepository clientRepository;
    private final EntityManager entityManager;

    protected AccountService(AccountRepository repository, AccountMapper accountMapper,
            org.springframework.context.ApplicationEventPublisher eventPublisher, ClientRepository clientRepository,
            EntityManager entityManager) {
        super(repository);
        this.accountMapper = accountMapper;
        this.eventPublisher = eventPublisher;
        this.clientRepository = clientRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public AccountRespDto createAccount(AccountDto accountDto) {
        return createAccountResult(accountDto).account();
    }

    @Transactional
    public AccountCommandResult createAccountResult(AccountDto accountDto) {
        return openAccount(accountDto, AccountStatus.CREATED);
    }

    @Transactional
    public AccountRespDto syncAccount(AccountDto accountDto) {
        return syncAccountResult(accountDto).account();
    }

    /**
     * Synchronise un compte. Si le client en a déjà un, le compte existant est renvoyé
     * tel quel (solde et numéro d'agence), avec un message qui nomme le client.
     */
    @Transactional
    public AccountCommandResult syncAccountResult(AccountDto accountDto) {
        return openAccount(accountDto, AccountStatus.ACTIF);
    }

    private AccountCommandResult openAccount(AccountDto accountDto, AccountStatus status) {
        Client client = requireActiveClient(accountDto.getClientId());
        lockClientAccount(client.getId());
        Account incoming = accountMapper.toEntity(accountDto);
        Optional<Account> existing = getRepository().findFirstByClient_Id(client.getId());
        if (existing.isPresent()) {
            Account found = existing.get();
            if (found.isDeleted()) {
                reactivate(found, incoming, status);
                Account saved = update(found);
                publishAccountCreationEvent(saved);
                return AccountCommandResult.created(saved);
            }
            log.info("Compte déjà existant pour le client {} : compte {}", client.getId(), found.getId());
            return AccountCommandResult.alreadyExists(found, client);
        }
        incoming.setStatus(status);
        Account saved = insertAccount(incoming, client);
        publishAccountCreationEvent(saved);
        return AccountCommandResult.created(saved);
    }

    /**
     * Sérialise les créations simultanées pour un même client afin que la seconde
     * requête voie le compte de la première au lieu de heurter la contrainte d'unicité.
     */
    private void lockClientAccount(Long clientId) {
        entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(?1))")
                .setParameter(1, "account:client:" + clientId)
                .getSingleResult();
    }

    private Account insertAccount(Account incoming, Client client) {
        try {
            return create(incoming);
        } catch (DataIntegrityViolationException ex) {
            log.warn("Création de compte refusée pour le client {} : contrainte d'unicité", client.getId());
            throw new CustomValidationException(AccountAlreadyExistsMessage.of(client, null));
        }
    }

    private void reactivate(Account existing, Account incoming, AccountStatus status) {
        existing.setState(State.ENABLED);
        existing.setAccountBalance(incoming.getAccountBalance());
        if (StringUtils.hasText(incoming.getAccountNumber())) {
            existing.setAccountNumber(incoming.getAccountNumber());
        }
        existing.setStatus(status);
    }

    private void publishAccountCreationEvent(Account account) {
        if (eventPublisher != null && account.getClient() != null) {
            Client client = clientRepository.findById(account.getClient().getId()).orElseThrow(
                    () -> new ResourceNotFoundException("Client non trouvé avec l'id: " + account.getClient().getId()));

            eventPublisher.publishEvent(new com.optimize.elykia.client.event.AccountCreatedEvent(
                    this,
                    account.getAccountBalance(),
                    client.getCollector(),
                    account.getAccountNumber()));
        }
    }

    /**
     * Refuse la création/modification de compte pour un client dont l'inscription
     * n'est pas encore validée (PENDING / REJECTED).
     */
    private Client requireActiveClient(Long clientId) {
        if (clientId == null) {
            throw new CustomValidationException("Le client est obligatoire pour créer un compte.");
        }
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client non trouvé avec l'id: " + clientId));
        if (!client.isActivationActive()) {
            throw new CustomValidationException(
                    "Ce client n'est pas encore validé : impossible de lui créer un compte.");
        }
        return client;
    }

    // MODIFIÉ : La méthode utilise maintenant le searchTerm pour filtrer les
    // résultats
    public Page<AccountRespDto> getAll(Pageable pageable, String searchTerm) {
        String effectiveSearchTerm = (searchTerm != null && !searchTerm.trim().isEmpty()) ? searchTerm : null;
        if (Objects.isNull(effectiveSearchTerm)) {
            return getRepository().findAccountsDto(State.DELETED, pageable);
        } else {
            return getRepository().findAccountsDtoWithSearch(effectiveSearchTerm, State.DELETED, pageable);
        }
    }

    public Page<AccountRespDto> getAllForCommercial(String commercial, Pageable pageable) {
        return getRepository().getAccountForCommercial(commercial, State.ENABLED, ClientType.CLIENT,
                AccountStatus.ACTIF, pageable);
    }

    public AccountKpiDto getAccountKpis() {
        return AccountKpiDto.builder()
                .activeCount(getRepository().countActiveAccounts(State.DELETED, AccountStatus.ACTIF))
                .inactiveCount(getRepository().countInactiveAccounts(State.DELETED, AccountStatus.ACTIF))
                .activeTotalBalance(getRepository().sumActiveAccountsBalance(State.DELETED, AccountStatus.ACTIF))
                .build();
    }

    // RESTAURÉ : Méthode privée pour construire la logique de recherche
    private Specification<Account> getSearchSpecification(String keyword) {
        final String searchKeyword = String.format("%%%s%%", keyword.toLowerCase());

        return (root, query, cb) -> {
            // Crée une jointure avec l'entité Client pour rechercher sur les noms
            jakarta.persistence.criteria.Join<Account, Client> clientJoin = root.join("client");
            jakarta.persistence.criteria.Predicate p = cb.or(
                    cb.like(cb.lower(root.get("accountNumber")), searchKeyword),
                    cb.like(cb.lower(clientJoin.get("firstname")), searchKeyword),
                    cb.like(cb.lower(clientJoin.get("lastname")), searchKeyword));

            // Crée les conditions de recherche (predicates)
            return cb.and(
                    p, cb.notEqual(root.get("state"), State.DELETED));
        };
    }

    @Transactional
    public AccountRespDto updateAccount(AccountDto accountDto, Long id) {
        requireActiveClient(accountDto.getClientId());
        accountDto.setId(id);
        Account existingOne = getById(id);
        Account account = accountMapper.toEntity(accountDto);
        account.setStatus(existingOne.getStatus()); // Preserve the status
        return AccountRespDto.fromAccount(update(account));
    }

    @Transactional
    public boolean changeStatus(Long id, AccountStatus status) {
        Account account = getById(id);
        account.setStatus(status);
        update(account);
        return Boolean.TRUE;
    }

    @Override
    public AccountRepository getRepository() {
        return (AccountRepository) super.getRepository();
    }
}
