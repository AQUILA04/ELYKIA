package com.optimize.elykia.core.service.adhesion;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.AccountRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.adhesion.AdhesionViewDto;
import com.optimize.elykia.core.dto.adhesion.ClientAdhesionsDto;
import com.optimize.elykia.core.entity.adhesion.AdhesionBalanceMovement;
import com.optimize.elykia.core.entity.adhesion.ClientAdhesion;
import com.optimize.elykia.core.enumaration.AdhesionMovementType;
import com.optimize.elykia.core.enumaration.AdhesionSource;
import com.optimize.elykia.core.enumaration.AdhesionStatus;
import com.optimize.elykia.core.enumaration.AdhesionType;
import com.optimize.elykia.core.enumaration.CreditPurpose;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.event.AdhesionCashEvent;
import com.optimize.elykia.core.repository.adhesion.AdhesionBalanceMovementRepository;
import com.optimize.elykia.core.repository.adhesion.ClientAdhesionRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class AdhesionService {

    /**
     * Jumeau serveur du remote config Firebase {@code dualCreditAuthorization}.
     * Désactivé : seul le crédit personnel historique s'applique.
     */
    public static final String DUAL_CREDIT_AUTHORIZATION = "DUAL_CREDIT_AUTHORIZATION";

    private static final String LEGACY_BALANCE_CONTROL = "ENABLED_ACCOUNT_BALANCE_CONTROL";

    private static final EnumSet<AdhesionStatus> OPEN_STATUSES =
            EnumSet.of(AdhesionStatus.PENDING, AdhesionStatus.ACTIVE, AdhesionStatus.SUSPENDED);

    private final ClientAdhesionRepository adhesionRepository;
    private final AdhesionBalanceMovementRepository movementRepository;
    private final ClientService clientService;
    private final AccountRepository accountRepository;
    private final UserService userService;
    private final ApplicationEventPublisher eventPublisher;
    private final ParameterService parameterService;

    @Value("${app.credit.dividend:6}")
    private int dividend;

    @Value("${app.credit.personal-ceiling:35000}")
    private double personalCeiling;

    @Value("${app.credit.personal-fee:500}")
    private double personalFee;

    @Value("${app.credit.business-fee:2000}")
    private double businessFee;

    @Value("${app.credit.event-fee:2000}")
    private double eventFee;

    @Transactional(readOnly = true)
    public List<AdhesionViewDto> listByClient(Long clientId) {
        clientService.getById(clientId);
        return adhesionRepository.findByClient_IdAndStateOrderByAdhesionTypeAsc(clientId, State.ENABLED)
                .stream()
                .map(adhesion -> AdhesionViewDto.from(adhesion, dividend, personalCeiling))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClientAdhesionsDto> listByCollector(String collector) {
        if (!StringUtils.hasText(collector)) {
            throw new CustomValidationException("Le commercial est obligatoire.");
        }
        var current = userService.getCurrentUser();
        boolean sameCommercial = current != null && collector.equalsIgnoreCase(current.getUsername());
        boolean gestionnaire = current != null && current.is(UserProfilConstant.GESTIONNAIRE);
        if (!sameCommercial && !gestionnaire) {
            throw new CustomValidationException("Vous ne pouvez consulter que les adhésions de votre portefeuille.");
        }
        return adhesionRepository.findByCollectorAndStatuses(collector, State.ENABLED, OPEN_STATUSES)
                .stream()
                .collect(java.util.stream.Collectors.groupingBy(a -> a.getClient().getId()))
                .entrySet()
                .stream()
                .map(entry -> new ClientAdhesionsDto(
                        entry.getKey(),
                        entry.getValue().stream()
                                .map(adhesion -> AdhesionViewDto.from(adhesion, dividend, personalCeiling))
                                .toList()))
                .sorted(Comparator.comparing(ClientAdhesionsDto::clientId))
                .toList();
    }

    public boolean isDualCreditAuthorizationEnabled() {
        return parameterService.isEnabled(DUAL_CREDIT_AUTHORIZATION);
    }

    public void requireDualCreditAuthorization() {
        if (!isDualCreditAuthorizationEnabled()) {
            throw new CustomValidationException(
                    "Les adhésions business et événement ne sont pas activées.");
        }
    }

    public List<AdhesionViewDto> subscribeAtCounter(Long clientId, AdhesionType type) {
        String performedBy = requireGestionnaire();
        applySubscribe(clientId, type, AdhesionSource.COUNTER, performedBy, true);
        return listByClient(clientId);
    }

    public List<AdhesionViewDto> topUpAtCounter(Long clientId, AdhesionType type, double amount) {
        String performedBy = requireGestionnaire();
        applyTopUp(clientId, type, amount, performedBy, true);
        return listByClient(clientId);
    }

    public void applySubscribe(
            Long clientId,
            AdhesionType type,
            AdhesionSource source,
            String performedBy,
            boolean publishCash) {
        requireDualCreditAuthorization();
        if (type == null) {
            throw new CustomValidationException("Le type d'adhésion est obligatoire.");
        }
        Client client = clientService.getById(clientId);
        requireActiveAccount(client);
        double fee = feeFor(type);
        ClientAdhesion existing = findOpen(clientId, type).orElse(null);
        if (existing != null && existing.getStatus() == AdhesionStatus.ACTIVE) {
            if (existing.isFeeWaived() && type != AdhesionType.PERSONAL) {
                throw new CustomValidationException(
                        "Cette adhésion est déjà ouverte. Ajoutez de l'argent au solde plutôt que de la souscrire à nouveau.");
            }
            throw new CustomValidationException("Cette adhésion est déjà active.");
        }
        if (existing != null && existing.getStatus() == AdhesionStatus.SUSPENDED) {
            throw new CustomValidationException("Cette adhésion est suspendue.");
        }

        ClientAdhesion adhesion = existing != null ? existing : new ClientAdhesion();
        if (existing == null) {
            adhesion.setClient(client);
            adhesion.setAdhesionType(type);
            adhesion.setBalance(0);
        }
        double previous = adhesion.getBalance();
        adhesion.setStatus(AdhesionStatus.ACTIVE);
        adhesion.setAdhesionFee(fee);
        adhesion.setFeeWaived(false);
        adhesion.setSource(source);
        adhesion.setActivatedAt(LocalDateTime.now());
        adhesion.setActivatedBy(performedBy);
        adhesion.setBalance(previous + fee);
        adhesionRepository.save(adhesion);
        recordMovement(adhesion, fee, AdhesionMovementType.ADHESION_FEE, "Dépôt d'adhésion " + label(type));

        if (type == AdhesionType.BUSINESS) {
            unlockCompanion(client, AdhesionType.PERSONAL, performedBy);
            unlockCompanion(client, AdhesionType.EVENT, performedBy);
            clientService.markBusinessCreditAuthorizedFromAdhesion(clientId, performedBy);
        }
        syncAccountBalance(clientId);
        if (publishCash) {
            publishCash(client, fee, cashType(type), "Adhésion " + label(type),
                    "Encaissement adhésion " + label(type));
        }
    }

    public void applyTopUp(Long clientId, AdhesionType type, double amount, String performedBy, boolean publishCash) {
        requireDualCreditAuthorization();
        if (amount <= 0) {
            throw new CustomValidationException("Le montant à ajouter doit être positif.");
        }
        Client client = clientService.getById(clientId);
        requireActiveAccount(client);
        ClientAdhesion adhesion = findOpen(clientId, type)
                .orElseThrow(() -> new CustomValidationException("Aucune adhésion " + label(type) + " à recharger."));
        if (adhesion.getStatus() == AdhesionStatus.SUSPENDED || adhesion.getStatus() == AdhesionStatus.CLOSED) {
            throw new CustomValidationException("Cette adhésion ne peut pas être rechargée.");
        }
        adhesion.setBalance(adhesion.getBalance() + amount);
        if (adhesion.getStatus() == AdhesionStatus.PENDING && adhesion.getBalance() + 0 >= feeFor(type)) {
            adhesion.setStatus(AdhesionStatus.ACTIVE);
            adhesion.setActivatedAt(LocalDateTime.now());
            adhesion.setActivatedBy(performedBy);
        }
        adhesionRepository.save(adhesion);
        recordMovement(adhesion, amount, AdhesionMovementType.TOP_UP, "Ajout au solde " + label(type));
        syncAccountBalance(clientId);
        if (publishCash) {
            publishCash(client, amount, OperationType.ADHESION_TOP_UP, "Recharge adhésion",
                    "Ajout au solde " + label(type));
        }
    }

    /**
     * Ouverture de compte : le dépôt initial alimente l'adhésion personnelle sans second encaissement
     * (le journal a déjà enregistré le nouveau compte).
     */
    public void ensurePersonalFromAccountOpening(Long clientId, double openingBalance) {
        if (findOpen(clientId, AdhesionType.PERSONAL).isPresent()) {
            return;
        }
        Client client = clientService.getById(clientId);
        ClientAdhesion adhesion = new ClientAdhesion();
        adhesion.setClient(client);
        adhesion.setAdhesionType(AdhesionType.PERSONAL);
        adhesion.setBalance(Math.max(openingBalance, 0));
        adhesion.setAdhesionFee(openingBalance >= personalFee ? personalFee : Math.max(openingBalance, 0));
        adhesion.setFeeWaived(openingBalance < personalFee);
        adhesion.setSource(AdhesionSource.COUNTER);
        adhesion.setStatus(openingBalance >= personalFee ? AdhesionStatus.ACTIVE : AdhesionStatus.PENDING);
        if (adhesion.getStatus() == AdhesionStatus.ACTIVE) {
            adhesion.setActivatedAt(LocalDateTime.now());
            adhesion.setActivatedBy("system");
        }
        adhesionRepository.save(adhesion);
        recordMovement(adhesion, adhesion.getBalance(), AdhesionMovementType.OPENING,
                "Solde d'ouverture du compte");
    }

    public void assertCreditAllowed(Client client, CreditPurpose purpose, Double amount) {
        if (client == null) {
            throw new CustomValidationException("Client introuvable.");
        }
        if (!isDualCreditAuthorizationEnabled()) {
            assertLegacyPersonalCredit(client, purpose, amount);
            return;
        }
        if (client.getClientType() != null && !ClientType.CLIENT.equals(client.getClientType())) {
            return;
        }
        requireActiveAccount(client);
        AdhesionType type = AdhesionType.fromCreditPurpose(purpose);
        ClientAdhesion adhesion = findOpen(client.getId(), type)
                .filter(item -> item.getStatus() == AdhesionStatus.ACTIVE)
                .orElseThrow(() -> new CustomValidationException(
                        "Le client n'a pas d'adhésion " + label(type) + " active."));
        CreditCeilingPolicy.assertWithinCeiling(
                type,
                amount == null ? 0d : amount,
                adhesion.getBalance(),
                dividend,
                personalCeiling);
    }

    /**
     * Remote config éteint : un seul palier, l'adhésion personnelle.
     * Le plafond redevient celui du solde de compte lorsque le contrôle historique est actif.
     */
    private void assertLegacyPersonalCredit(Client client, CreditPurpose purpose, Double amount) {
        if (purpose != null && purpose != CreditPurpose.PERSONAL) {
            throw new CustomValidationException("Seul le crédit personnel est disponible.");
        }
        if (!parameterService.isEnabled(LEGACY_BALANCE_CONTROL)) {
            return;
        }
        client.hasValidAccount();
        client.allowCreditAmountControl(amount == null ? 0d : amount, dividend);
    }

    public double feeFor(AdhesionType type) {
        return switch (type) {
            case PERSONAL -> personalFee;
            case BUSINESS -> businessFee;
            case EVENT -> eventFee;
        };
    }

    private void unlockCompanion(Client client, AdhesionType type, String performedBy) {
        ClientAdhesion existing = findOpen(client.getId(), type).orElse(null);
        if (existing == null) {
            ClientAdhesion created = new ClientAdhesion();
            created.setClient(client);
            created.setAdhesionType(type);
            created.setStatus(AdhesionStatus.ACTIVE);
            created.setAdhesionFee(0);
            created.setFeeWaived(true);
            created.setBalance(0);
            created.setSource(AdhesionSource.BUSINESS_UNLOCK);
            created.setActivatedAt(LocalDateTime.now());
            created.setActivatedBy(performedBy);
            adhesionRepository.save(created);
            recordMovement(created, 0, AdhesionMovementType.ADHESION_FEE,
                    "Adhésion " + label(type) + " offerte avec l'adhésion business");
            return;
        }
        if (existing.getStatus() != AdhesionStatus.ACTIVE) {
            existing.setStatus(AdhesionStatus.ACTIVE);
            existing.setFeeWaived(true);
            existing.setActivatedAt(LocalDateTime.now());
            existing.setActivatedBy(performedBy);
            if (existing.getSource() == null) {
                existing.setSource(AdhesionSource.BUSINESS_UNLOCK);
            }
            adhesionRepository.save(existing);
        }
    }

    private java.util.Optional<ClientAdhesion> findOpen(Long clientId, AdhesionType type) {
        return adhesionRepository.findByClient_IdAndAdhesionTypeAndStateAndStatusIn(
                clientId, type, State.ENABLED, OPEN_STATUSES);
    }

    private void recordMovement(ClientAdhesion adhesion, double amount, AdhesionMovementType type, String note) {
        AdhesionBalanceMovement movement = new AdhesionBalanceMovement();
        movement.setAdhesion(adhesion);
        movement.setAmount(amount);
        movement.setMovementType(type);
        movement.setNote(note);
        movementRepository.save(movement);
    }

    private void syncAccountBalance(Long clientId) {
        double sum = adhesionRepository.findByClient_IdAndStateOrderByAdhesionTypeAsc(clientId, State.ENABLED)
                .stream()
                .filter(adhesion -> OPEN_STATUSES.contains(adhesion.getStatus()))
                .mapToDouble(ClientAdhesion::getBalance)
                .sum();
        accountRepository.findByClient_IdAndState(clientId, State.ENABLED).ifPresent(account -> {
            account.setAccountBalance(sum);
            accountRepository.save(account);
        });
    }

    private void requireActiveAccount(Client client) {
        Account account = client.getAccount();
        if (account == null || account.getId() == null || !AccountStatus.ACTIF.equals(account.getStatus())) {
            throw new CustomValidationException("Le compte du client n'est pas actif.");
        }
    }

    private void publishCash(Client client, double amount, OperationType type, String label, String description) {
        if (amount <= 0 || eventPublisher == null || !StringUtils.hasText(client.getCollector())) {
            return;
        }
        eventPublisher.publishEvent(new AdhesionCashEvent(
                this, client.getCollector(), amount, type, label, description));
    }

    private OperationType cashType(AdhesionType type) {
        return switch (type) {
            case PERSONAL -> OperationType.ADHESION_PERSONAL;
            case BUSINESS -> OperationType.ADHESION_BUSINESS;
            case EVENT -> OperationType.ADHESION_EVENT;
        };
    }

    private String requireGestionnaire() {
        var currentUser = userService.getCurrentUser();
        if (currentUser == null || !currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new CustomValidationException("Seul un gestionnaire peut encaisser une adhésion.");
        }
        return currentUser.getUsername();
    }

    static String label(AdhesionType type) {
        return switch (Objects.requireNonNullElse(type, AdhesionType.PERSONAL)) {
            case PERSONAL -> "personnelle";
            case BUSINESS -> "business";
            case EVENT -> "événement";
        };
    }
}
