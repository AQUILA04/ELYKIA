package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.dto.AccountDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.AccountService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.customer.ClientRegistrationActivateRequest;
import com.optimize.elykia.core.dto.customer.ClientRegistrationDto;
import com.optimize.elykia.core.dto.customer.ClientRegistrationRejectRequest;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositDto;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositRejectRequest;
import com.optimize.elykia.core.entity.customer.CustomerInitialDepositSubmission;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.customer.CustomerInitialDepositSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ClientRegistrationAdminService {

    private static final EnumSet<CustomerSubmissionStatus> DEPOSIT_HIGHLIGHT =
            EnumSet.of(CustomerSubmissionStatus.INITIE, CustomerSubmissionStatus.VALIDE);

    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final AccountService accountService;
    private final CustomerInitialDepositSubmissionRepository depositRepository;

    @Transactional(readOnly = true)
    public Page<ClientRegistrationDto> list(
            ClientActivationStatus status,
            Boolean hasInitialDeposit,
            Pageable pageable) {
        ClientActivationStatus effective = status != null ? status : ClientActivationStatus.PENDING;
        Page<Client> page = clientRepository.findByActivationStatusAndClientTypeAndState(
                effective, ClientType.CLIENT, State.ENABLED, pageable);
        if (page.isEmpty()) {
            return Page.empty(pageable);
        }
        List<Long> clientIds = page.getContent().stream().map(Client::getId).toList();
        Map<Long, CustomerInitialDepositSubmission> depositsByClient = depositRepository
                .findByClientIdInAndState(clientIds, State.ENABLED)
                .stream()
                .filter(d -> DEPOSIT_HIGHLIGHT.contains(d.getStatus())
                        || CustomerSubmissionStatus.REJETE.equals(d.getStatus()))
                .collect(Collectors.toMap(
                        CustomerInitialDepositSubmission::getClientId,
                        Function.identity(),
                        (a, b) -> a.getId() != null && b.getId() != null && a.getId() > b.getId() ? a : b));

        List<ClientRegistrationDto> dtos = new ArrayList<>();
        for (Client client : page.getContent()) {
            CustomerInitialDepositSubmission deposit = depositsByClient.get(client.getId());
            boolean hasDeposit = deposit != null
                    && DEPOSIT_HIGHLIGHT.contains(deposit.getStatus());
            if (hasInitialDeposit != null && hasInitialDeposit != hasDeposit) {
                continue;
            }
            dtos.add(toDto(client, deposit));
        }
        if (hasInitialDeposit != null) {
            return new PageImpl<>(dtos, pageable, dtos.size());
        }
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ClientRegistrationDto get(Long clientId) {
        Client client = clientService.getById(clientId);
        CustomerInitialDepositSubmission deposit = latestDeposit(clientId);
        return toDto(client, deposit);
    }

    public ClientRegistrationDto activate(User user, Long clientId, ClientRegistrationActivateRequest request) {
        Client client = clientService.getById(clientId);
        if (!ClientActivationStatus.PENDING.equals(client.getActivationStatus())) {
            throw new CustomValidationException("Seules les inscriptions en attente peuvent être activées.");
        }
        if (!StringUtils.hasText(request.getCollector())) {
            throw new CustomValidationException("Le commercial crédit est obligatoire.");
        }
        client.setCollector(request.getCollector().trim());
        if (StringUtils.hasText(request.getTontineCollector())) {
            client.setTontineCollector(request.getTontineCollector().trim());
        }
        client.setActivationStatus(ClientActivationStatus.ACTIVE);
        client.setActivationRejectionReason(null);
        client.setActivationRejectedAt(null);
        client.setActivationRejectedBy(null);
        if (StringUtils.hasText(user.getUsername())) {
            client.setLastModifiedBy(user.getUsername());
        }
        client = clientRepository.save(client);

        CustomerInitialDepositSubmission deposit = latestDeposit(clientId);
        double balance = 0;
        boolean activateAccount = false;
        if (deposit != null && CustomerSubmissionStatus.INITIE.equals(deposit.getStatus())
                && request.isValidateInitialDeposit()) {
            markDepositValidated(user, deposit);
            balance = deposit.getMobileMoneyAmount() != null ? deposit.getMobileMoneyAmount() : 0;
            activateAccount = true;
        } else if (deposit != null && CustomerSubmissionStatus.VALIDE.equals(deposit.getStatus())) {
            balance = deposit.getMobileMoneyAmount() != null ? deposit.getMobileMoneyAmount() : 0;
            activateAccount = true;
        }

        ensureAccount(client, balance, activateAccount);
        return toDto(clientRepository.findById(clientId).orElse(client), latestDeposit(clientId));
    }

    public ClientRegistrationDto reject(User user, Long clientId, ClientRegistrationRejectRequest request) {
        Client client = clientService.getById(clientId);
        if (!ClientActivationStatus.PENDING.equals(client.getActivationStatus())) {
            throw new CustomValidationException("Seules les inscriptions en attente peuvent être refusées.");
        }
        client.setActivationStatus(ClientActivationStatus.REJECTED);
        client.setActivationRejectionReason(request.getReason().trim());
        client.setActivationRejectedBy(user.getUsername());
        client.setActivationRejectedAt(LocalDateTime.now());
        if (StringUtils.hasText(user.getUsername())) {
            client.setLastModifiedBy(user.getUsername());
        }
        client = clientRepository.save(client);
        return toDto(client, latestDeposit(clientId));
    }

    public CustomerInitialDepositDto validateDeposit(User user, Long depositId) {
        CustomerInitialDepositSubmission submission = depositRepository.findById(depositId)
                .orElseThrow(() -> new ResourceNotFoundException("Déclaration de dépôt initial introuvable."));
        if (submission.getStatus() != CustomerSubmissionStatus.INITIE) {
            throw new CustomValidationException("Seules les déclarations initiées peuvent être validées.");
        }
        markDepositValidated(user, submission);
        Client client = clientService.getById(submission.getClientId());
        if (ClientActivationStatus.ACTIVE.equals(client.getActivationStatus())) {
            ensureAccount(client, submission.getMobileMoneyAmount(), true);
        }
        return toDepositDto(submission);
    }

    public CustomerInitialDepositDto rejectDeposit(User user, Long depositId, CustomerInitialDepositRejectRequest request) {
        CustomerInitialDepositSubmission submission = depositRepository.findById(depositId)
                .orElseThrow(() -> new ResourceNotFoundException("Déclaration de dépôt initial introuvable."));
        if (submission.getStatus() != CustomerSubmissionStatus.INITIE) {
            throw new CustomValidationException("Seules les déclarations initiées peuvent être rejetées.");
        }
        submission.setStatus(CustomerSubmissionStatus.REJETE);
        submission.setRejectedBy(user.getUsername());
        submission.setRejectedAt(LocalDateTime.now());
        submission.setRejectionReason(request != null && StringUtils.hasText(request.getReason())
                ? request.getReason().trim()
                : null);
        if (StringUtils.hasText(user.getUsername())) {
            submission.setLastModifiedBy(user.getUsername());
        }
        submission = depositRepository.save(submission);
        return toDepositDto(submission);
    }

    private void markDepositValidated(User user, CustomerInitialDepositSubmission deposit) {
        deposit.setStatus(CustomerSubmissionStatus.VALIDE);
        deposit.setValidatedBy(user.getUsername());
        deposit.setValidatedAt(LocalDateTime.now());
        if (StringUtils.hasText(user.getUsername())) {
            deposit.setLastModifiedBy(user.getUsername());
        }
        depositRepository.save(deposit);
    }

    private void ensureAccount(Client client, double balance, boolean actif) {
        Client fresh = clientRepository.findById(client.getId()).orElse(client);
        if (fresh.getAccount() != null && fresh.getAccount().getId() != null) {
            AccountDto update = new AccountDto();
            update.setId(fresh.getAccount().getId());
            update.setClientId(fresh.getId());
            update.setAccountNumber(fresh.getAccount().getAccountNumber());
            update.setAccountBalance(balance > 0 ? balance : fresh.getAccount().getAccountBalance());
            accountService.updateAccount(update, fresh.getAccount().getId());
            if (actif) {
                accountService.changeStatus(fresh.getAccount().getId(), AccountStatus.ACTIF);
            }
            return;
        }
        long total = accountService.getRepository().count();
        String accountNumber = "002102" + String.format("%04d", total + 1);
        AccountDto dto = new AccountDto();
        dto.setClientId(fresh.getId());
        dto.setAccountNumber(accountNumber);
        dto.setAccountBalance(Math.max(balance, 0));
        if (actif && balance > 0) {
            accountService.syncAccount(dto);
        } else {
            accountService.createAccount(dto);
        }
    }

    private CustomerInitialDepositSubmission latestDeposit(Long clientId) {
        return depositRepository.findByClientIdInAndState(List.of(clientId), State.ENABLED)
                .stream()
                .sorted((a, b) -> Long.compare(
                        Objects.requireNonNullElse(b.getId(), 0L),
                        Objects.requireNonNullElse(a.getId(), 0L)))
                .findFirst()
                .orElse(null);
    }

    private ClientRegistrationDto toDto(Client client, CustomerInitialDepositSubmission deposit) {
        boolean hasDeposit = deposit != null && DEPOSIT_HIGHLIGHT.contains(deposit.getStatus());
        return ClientRegistrationDto.builder()
                .clientId(client.getId())
                .firstname(client.getFirstname())
                .lastname(client.getLastname())
                .fullName(client.getFullName())
                .phone(client.getPhone())
                .address(client.getAddress())
                .quarter(client.getQuarter())
                .dateOfBirth(client.getDateOfBirth())
                .occupation(client.getOccupation())
                .cardType(client.getCardType())
                .cardID(client.getCardID())
                .profilPhotoUrl(client.getProfilPhotoUrl())
                .cardPhotoUrl(client.getCardPhotoUrl())
                .activationStatus(client.getActivationStatus() != null
                        ? client.getActivationStatus().name()
                        : ClientActivationStatus.ACTIVE.name())
                .collector(client.getCollector())
                .tontineCollector(client.getTontineCollector())
                .registeredAt(client.getCreatedDate())
                .hasInitialDeposit(hasDeposit)
                .initialDepositId(deposit != null ? deposit.getId() : null)
                .initialDepositStatus(deposit != null ? deposit.getStatus() : null)
                .initialDepositAmount(deposit != null ? deposit.getMobileMoneyAmount() : null)
                .initialDepositPhone(deposit != null ? deposit.getMobileMoneyPhone() : null)
                .initialDepositReference(deposit != null ? deposit.getMobileMoneyReference() : null)
                .activationRejectionReason(client.getActivationRejectionReason())
                .build();
    }

    private CustomerInitialDepositDto toDepositDto(CustomerInitialDepositSubmission submission) {
        return CustomerInitialDepositDto.builder()
                .id(submission.getId())
                .clientId(submission.getClientId())
                .mobileMoneyPhone(submission.getMobileMoneyPhone())
                .mobileMoneyAmount(submission.getMobileMoneyAmount())
                .mobileMoneyReference(submission.getMobileMoneyReference())
                .notes(submission.getNotes())
                .status(submission.getStatus())
                .validatedAt(submission.getValidatedAt())
                .validatedBy(submission.getValidatedBy())
                .rejectedAt(submission.getRejectedAt())
                .rejectedBy(submission.getRejectedBy())
                .rejectionReason(submission.getRejectionReason())
                .build();
    }
}
