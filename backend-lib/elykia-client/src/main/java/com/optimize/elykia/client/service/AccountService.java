package com.optimize.elykia.client.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.client.dto.AccountDto;
import com.optimize.elykia.client.dto.AccountRespDto;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.mapper.AccountMapper;
import com.optimize.elykia.client.repository.AccountRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional(readOnly = true)
public class AccountService extends GenericService<Account, Long> {
    private final AccountMapper accountMapper;

    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final ClientRepository clientRepository;

    protected AccountService(AccountRepository repository, AccountMapper accountMapper,
            org.springframework.context.ApplicationEventPublisher eventPublisher, ClientRepository clientRepository) {
        super(repository);
        this.accountMapper = accountMapper;
        this.eventPublisher = eventPublisher;
        this.clientRepository = clientRepository;
    }

    @Transactional
    public AccountRespDto createAccount(AccountDto accountDto) {
        Account account = accountMapper.toEntity(accountDto);
        account.setStatus(AccountStatus.CREATED);
        Account savedAccount = create(account);

        publishAccountCreationEvent(savedAccount);

        return AccountRespDto.fromAccount(savedAccount);
    }

    @Transactional
    public AccountRespDto syncAccount(AccountDto accountDto) {
        Account account = accountMapper.toEntity(accountDto);
        account.setStatus(AccountStatus.ACTIF);
        Account savedAccount = create(account);

        publishAccountCreationEvent(savedAccount);

        return AccountRespDto.fromAccount(savedAccount);
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

    // MODIFIÉ : La méthode utilise maintenant le searchTerm pour filtrer les
    // résultats
    public Page<AccountRespDto> getAll(Pageable pageable, String searchTerm) {
        String effectiveSearchTerm = (searchTerm != null && !searchTerm.trim().isEmpty()) ? searchTerm : null;
        return getRepository().findAccountsDto(effectiveSearchTerm, State.DELETED, pageable);
    }

    public Page<AccountRespDto> getAllForCommercial(String commercial, Pageable pageable) {
        return getRepository().getAccountForCommercial(commercial, State.ENABLED, ClientType.CLIENT,
                AccountStatus.ACTIF, pageable);
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
