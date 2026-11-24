package com.optimize.elykia.client.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.api.BulkPortfolioOperationMode;
import com.optimize.elykia.client.api.CommercialAssignmentEventType;
import com.optimize.elykia.client.api.CommercialAssignmentStatus;
import com.optimize.elykia.client.api.CommercialPortfolioAccessPort;
import com.optimize.elykia.client.api.PortfolioActivityType;
import com.optimize.elykia.client.config.EvictClientListCaches;
import com.optimize.elykia.client.dto.BulkPortfolioOperationDto;
import com.optimize.elykia.client.dto.BulkPortfolioPreviewDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.entity.ClientCommercialAssignment;
import com.optimize.elykia.client.entity.ClientCommercialAssignmentHistory;
import com.optimize.elykia.client.event.InProgressCreditsTransferEvent;
import com.optimize.elykia.client.repository.ClientCommercialAssignmentHistoryRepository;
import com.optimize.elykia.client.repository.ClientCommercialAssignmentRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Service DDD de gestion des affectations commerciales par client et par activité (CREDIT, TONTINE, AGENCY, RECOVERY),
 * unitaire et en masse (Bulk 1 000+ clients : relais A->B, co-affectation active, désactivation consultation seule, réactivation).
 */
@Service
@Transactional
public class ClientCommercialPortfolioService implements CommercialPortfolioAccessPort {

    private final ClientCommercialAssignmentRepository assignmentRepository;
    private final ClientCommercialAssignmentHistoryRepository historyRepository;
    private final ClientRepository clientRepository;
    private final UserService userService;
    private final ApplicationEventPublisher eventPublisher;

    public ClientCommercialPortfolioService(ClientCommercialAssignmentRepository assignmentRepository,
                                            ClientCommercialAssignmentHistoryRepository historyRepository,
                                            ClientRepository clientRepository,
                                            UserService userService,
                                            ApplicationEventPublisher eventPublisher) {
        this.assignmentRepository = assignmentRepository;
        this.historyRepository = historyRepository;
        this.clientRepository = clientRepository;
        this.userService = userService;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(readOnly = true)
    public AccessMode resolveClientAccess(String commercialUsername, Long clientId, PortfolioActivityType activityType) {
        if (!StringUtils.hasText(commercialUsername) || clientId == null || activityType == null) {
            return AccessMode.DENIED;
        }
        if (isCommercialActiveOnClient(commercialUsername, clientId, activityType)) {
            return AccessMode.READ_WRITE;
        }
        if (isCommercialInactiveOnClient(commercialUsername, clientId, activityType)) {
            return AccessMode.READ_ONLY_OWN_OPERATIONS;
        }
        return AccessMode.DENIED;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isCommercialActiveOnClient(String commercialUsername, Long clientId,
                                              PortfolioActivityType activityType) {
        if (!StringUtils.hasText(commercialUsername) || clientId == null || activityType == null) {
            return false;
        }
        if (assignmentRepository.existsByClientIdAndCommercialUsernameIgnoreCaseAndActivityTypeAndStatus(
                clientId, commercialUsername, activityType, CommercialAssignmentStatus.ACTIVE)) {
            return true;
        }
        // Repli de compatibilité sur la colonne scalaire de Client si aucune ligne d'affectation n'a encore été créée
        return clientRepository.findById(clientId)
                .map(client -> commercialUsername.equalsIgnoreCase(scalarCommercial(client, activityType)))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isCommercialInactiveOnClient(String commercialUsername, Long clientId,
                                                PortfolioActivityType activityType) {
        if (!StringUtils.hasText(commercialUsername) || clientId == null || activityType == null) {
            return false;
        }
        return assignmentRepository.existsByClientIdAndCommercialUsernameIgnoreCaseAndActivityTypeAndStatus(
                clientId, commercialUsername, activityType, CommercialAssignmentStatus.INACTIVE);
    }

    @Override
    @Transactional(readOnly = true)
    public void assertCommercialCanOperateOnClient(String commercialUsername, Long clientId,
                                                   PortfolioActivityType activityType) {
        AccessMode mode = resolveClientAccess(commercialUsername, clientId, activityType);
        if (mode == AccessMode.READ_WRITE) {
            return;
        }
        if (mode == AccessMode.READ_ONLY_OWN_OPERATIONS) {
            throw new CustomValidationException("Votre affectation " + activityType
                    + " sur ce client est actuellement inactive (consultation seule de vos propres opérations). "
                    + "Contactez le gestionnaire pour la réactiver.");
        }
        throw new CustomValidationException(
                "Ce client ne vous est pas affecté en tant que commercial " + activityType + ".");
    }

    @Transactional(readOnly = true)
    public List<ClientCommercialAssignment> listClientAssignments(Long clientId) {
        return assignmentRepository
                .findByClientIdOrderByActivityTypeAscPrimaryDescStatusAscCommercialUsernameAsc(clientId);
    }

    @Transactional(readOnly = true)
    public List<ClientCommercialAssignmentHistory> listClientHistory(Long clientId, PortfolioActivityType activityType) {
        return historyRepository.findByClient(clientId, activityType);
    }

    /**
     * Affecte ou réactive un commercial sur un client pour une activité.
     * Si {@code handoverFromExisting} est vrai (mode Relais), les commerciaux actuellement {@code ACTIVE}
     * sur cette activité passent automatiquement à {@code INACTIVE} (consultation seule sur leurs propres opérations).
     */
    @EvictClientListCaches
    public ClientCommercialAssignment assignOrRelay(Long clientId, String commercialUsername,
                                                    PortfolioActivityType activityType, boolean makePrimary,
                                                    boolean handoverFromExisting, String reason) {
        if (clientId == null || !StringUtils.hasText(commercialUsername) || activityType == null) {
            throw new CustomValidationException("Client, commercial et type d'activité sont obligatoires.");
        }
        String normalized = commercialUsername.trim();
        String actor = currentActor();

        List<ClientCommercialAssignment> existingForActivity = assignmentRepository
                .findByClientIdAndActivityTypeOrderByPrimaryDescStatusAscIdAsc(clientId, activityType);

        if (handoverFromExisting) {
            for (ClientCommercialAssignment current : existingForActivity) {
                if (current.isActive() && !current.getCommercialUsername().equalsIgnoreCase(normalized)) {
                    boolean wasPrimary = current.isPrimary();
                    current.deactivate(actor, reason != null ? reason : "Relais vers " + normalized);
                    assignmentRepository.save(current);
                    recordHistory(current, CommercialAssignmentEventType.RELAY_HANDOVER,
                            CommercialAssignmentStatus.ACTIVE, CommercialAssignmentStatus.INACTIVE, wasPrimary, false,
                            normalized, current.getStatusReason(), actor);
                }
            }
        } else if (makePrimary) {
            for (ClientCommercialAssignment current : existingForActivity) {
                if (current.isPrimary() && !current.getCommercialUsername().equalsIgnoreCase(normalized)) {
                    current.setPrimary(false);
                    assignmentRepository.save(current);
                    recordHistory(current, CommercialAssignmentEventType.DEMOTED_PRIMARY, current.getStatus(),
                            current.getStatus(), true, false, normalized, reason, actor);
                }
            }
        }

        boolean shouldBePrimary = makePrimary || handoverFromExisting
                || existingForActivity.stream().noneMatch(a -> a.isActive() && a.isPrimary());

        Optional<ClientCommercialAssignment> existingOpt = assignmentRepository
                .findByClientIdAndCommercialUsernameIgnoreCaseAndActivityType(clientId, normalized, activityType);

        ClientCommercialAssignment target;
        if (existingOpt.isPresent()) {
            target = existingOpt.get();
            CommercialAssignmentStatus prevStatus = target.getStatus();
            boolean wasPrimary = target.isPrimary();
            target.activateOrReactivate(shouldBePrimary, actor, reason);
            target = assignmentRepository.save(target);
            CommercialAssignmentEventType eventType = prevStatus == CommercialAssignmentStatus.INACTIVE
                    ? CommercialAssignmentEventType.REACTIVATED : CommercialAssignmentEventType.ACTIVATED;
            recordHistory(target, eventType, prevStatus, CommercialAssignmentStatus.ACTIVE, wasPrimary,
                    target.isPrimary(), null, reason, actor);
        } else {
            target = ClientCommercialAssignment.createActive(clientId, normalized, activityType, shouldBePrimary, actor,
                    reason);
            target = assignmentRepository.save(target);
            recordHistory(target, CommercialAssignmentEventType.ASSIGNED, null, CommercialAssignmentStatus.ACTIVE,
                    false, target.isPrimary(), null, reason, actor);
        }

        syncPrimaryToClientScalarColumn(clientId, activityType);
        return target;
    }

    /** Change le statut d'une affectation existante (ACTIVE <-> INACTIVE) avec traçabilité dans l'historique. */
    @EvictClientListCaches
    public ClientCommercialAssignment changeStatus(Long assignmentId, CommercialAssignmentStatus newStatus,
                                                   Boolean makePrimary, String reason) {
        ClientCommercialAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new CustomValidationException("Affectation commerciale introuvable."));
        if (newStatus == null) {
            throw new CustomValidationException("Le nouveau statut est obligatoire.");
        }
        String actor = currentActor();
        CommercialAssignmentStatus previousStatus = assignment.getStatus();
        boolean wasPrimary = assignment.isPrimary();

        if (newStatus == CommercialAssignmentStatus.INACTIVE) {
            assignment.deactivate(actor, reason);
            assignment = assignmentRepository.save(assignment);
            recordHistory(assignment, CommercialAssignmentEventType.DEACTIVATED, previousStatus,
                    CommercialAssignmentStatus.INACTIVE, wasPrimary, false, null, reason, actor);
        } else {
            boolean primary = Boolean.TRUE.equals(makePrimary) || wasPrimary;
            if (primary) {
                demoteOtherPrimaries(assignment.getClientId(), assignment.getActivityType(),
                        assignment.getCommercialUsername(), actor, reason);
            }
            assignment.activateOrReactivate(primary, actor, reason);
            assignment = assignmentRepository.save(assignment);
            CommercialAssignmentEventType type = previousStatus == CommercialAssignmentStatus.INACTIVE
                    ? CommercialAssignmentEventType.REACTIVATED : CommercialAssignmentEventType.ACTIVATED;
            recordHistory(assignment, type, previousStatus, CommercialAssignmentStatus.ACTIVE, wasPrimary,
                    assignment.isPrimary(), null, reason, actor);
        }

        syncPrimaryToClientScalarColumn(assignment.getClientId(), assignment.getActivityType());
        return assignment;
    }

    /** Aperçu du nombre de clients et d'affectations impactés avant l'exécution d'une opération en masse. */
    @Transactional(readOnly = true)
    public BulkPortfolioPreviewDto previewBulkOperation(BulkPortfolioOperationDto dto) {
        List<PortfolioActivityType> activities = resolveActivities(dto.activityTypes());
        Set<Long> clientIds = resolveTargetClientIds(dto, activities);
        return new BulkPortfolioPreviewDto(clientIds.size(), clientIds.size() * activities.size());
    }

    /**
     * Exécute en masse (sur tout le portefeuille d'un commercial source A ou sur une sélection filtrée) :
     * relais A->B, co-affectation de B en actif, désactivation de A, ou réactivation du portefeuille de A.
     */
    @EvictClientListCaches
    public BulkPortfolioPreviewDto executeBulkOperation(BulkPortfolioOperationDto dto) {
        if (dto == null || dto.mode() == null) {
            throw new CustomValidationException("Le mode d'opération en masse est obligatoire.");
        }
        List<PortfolioActivityType> activities = resolveActivities(dto.activityTypes());
        Set<Long> clientIds = resolveTargetClientIds(dto, activities);
        if (clientIds.isEmpty()) {
            return new BulkPortfolioPreviewDto(0, 0);
        }
        int modified = 0;
        String actor = currentActor();

        for (Long clientId : clientIds) {
            for (PortfolioActivityType activity : activities) {
                switch (dto.mode()) {
                    case HANDOVER_RELAY -> {
                        requireTargetCommercial(dto.targetCommercialUsername());
                        assignOrRelay(clientId, dto.targetCommercialUsername(), activity, true, true, dto.reason());
                        modified++;
                    }
                    case ADD_CO_COMMERCIAL -> {
                        requireTargetCommercial(dto.targetCommercialUsername());
                        assignOrRelay(clientId, dto.targetCommercialUsername(), activity, false, false, dto.reason());
                        modified++;
                    }
                    case DEACTIVATE_COMMERCIAL -> {
                        requireSourceCommercial(dto.sourceCommercialUsername());
                        assignmentRepository.findByClientIdAndCommercialUsernameIgnoreCaseAndActivityType(
                                clientId, dto.sourceCommercialUsername().trim(), activity).ifPresent(a -> {
                            if (a.isActive()) {
                                changeStatus(a.getId(), CommercialAssignmentStatus.INACTIVE, false, dto.reason());
                            }
                        });
                        modified++;
                    }
                    case REACTIVATE_COMMERCIAL -> {
                        String toReactivate = StringUtils.hasText(dto.targetCommercialUsername())
                                ? dto.targetCommercialUsername() : dto.sourceCommercialUsername();
                        requireSourceCommercial(toReactivate);
                        assignOrRelay(clientId, toReactivate.trim(), activity, true, false, dto.reason());
                        modified++;
                    }
                }
            }
        }

        if (dto.transferInProgressCredits()
                && (dto.mode() == BulkPortfolioOperationMode.HANDOVER_RELAY
                || dto.mode() == BulkPortfolioOperationMode.ADD_CO_COMMERCIAL)
                && StringUtils.hasText(dto.targetCommercialUsername())
                && activities.contains(PortfolioActivityType.CREDIT)) {
            eventPublisher.publishEvent(new InProgressCreditsTransferEvent(
                    this, new ArrayList<>(clientIds), dto.targetCommercialUsername().trim(), actor));
        }

        return new BulkPortfolioPreviewDto(clientIds.size(), modified);
    }

    private Set<Long> resolveTargetClientIds(BulkPortfolioOperationDto dto, List<PortfolioActivityType> activities) {
        Set<Long> ids = new LinkedHashSet<>();
        if (dto.clientIds() != null && !dto.clientIds().isEmpty()) {
            ids.addAll(dto.clientIds());
        } else if (StringUtils.hasText(dto.sourceCommercialUsername())) {
            String source = dto.sourceCommercialUsername().trim();
            CommercialAssignmentStatus targetStatus = dto.mode() == BulkPortfolioOperationMode.REACTIVATE_COMMERCIAL
                    ? CommercialAssignmentStatus.INACTIVE : CommercialAssignmentStatus.ACTIVE;
            for (PortfolioActivityType activity : activities) {
                assignmentRepository.findByCommercialUsernameIgnoreCaseAndActivityTypeAndStatus(
                                source, activity, targetStatus)
                        .forEach(a -> ids.add(a.getClientId()));
            }
            // Complète avec les clients portant encore uniquement la colonne scalaire legacy
            if (targetStatus == CommercialAssignmentStatus.ACTIVE) {
                for (Client c : clientRepository.findAll()) {
                    if (c.getState() == State.DELETED) {
                        continue;
                    }
                    for (PortfolioActivityType activity : activities) {
                        if (source.equalsIgnoreCase(scalarCommercial(c, activity))) {
                            ids.add(c.getId());
                        }
                    }
                }
            }
        } else {
            throw new CustomValidationException(
                    "Veuillez sélectionner un commercial source ou une liste de clients pour l'opération en masse.");
        }

        if (StringUtils.hasText(dto.quarter()) && !ids.isEmpty()) {
            String q = dto.quarter().trim();
            Set<Long> filtered = new LinkedHashSet<>();
            for (Client client : clientRepository.findAllByIds(new ArrayList<>(ids))) {
                if (q.equalsIgnoreCase(client.getQuarter())) {
                    filtered.add(client.getId());
                }
            }
            return filtered;
        }
        return ids;
    }

    private void demoteOtherPrimaries(Long clientId, PortfolioActivityType activityType, String keepCommercial,
                                      String actor, String reason) {
        for (ClientCommercialAssignment current : assignmentRepository
                .findByClientIdAndActivityTypeOrderByPrimaryDescStatusAscIdAsc(clientId, activityType)) {
            if (current.isPrimary() && !current.getCommercialUsername().equalsIgnoreCase(keepCommercial)) {
                current.setPrimary(false);
                assignmentRepository.save(current);
                recordHistory(current, CommercialAssignmentEventType.DEMOTED_PRIMARY, current.getStatus(),
                        current.getStatus(), true, false, keepCommercial, reason, actor);
            }
        }
    }

    /**
     * Synchronise le commercial principal ACTIVE vers la colonne scalaire de {@link Client}
     * pour maintenir 100 % de compatibilité avec les requêtes legacy et le mobile.
     */
    private void syncPrimaryToClientScalarColumn(Long clientId, PortfolioActivityType activityType) {
        clientRepository.findById(clientId).ifPresent(client -> {
            List<ClientCommercialAssignment> active = assignmentRepository
                    .findByClientIdAndActivityTypeOrderByPrimaryDescStatusAscIdAsc(clientId, activityType)
                    .stream().filter(ClientCommercialAssignment::isActive).toList();
            String primaryUsername = active.isEmpty() ? null : active.get(0).getCommercialUsername();
            if (!active.isEmpty() && !active.get(0).isPrimary()) {
                ClientCommercialAssignment promoted = active.get(0);
                promoted.setPrimary(true);
                assignmentRepository.save(promoted);
            }
            switch (activityType) {
                case CREDIT -> client.setCreditCommercialUsername(primaryUsername);
                case TONTINE -> client.setTontineCommercialUsername(primaryUsername);
                case AGENCY -> client.setAgencyCommercialUsername(primaryUsername);
                case RECOVERY -> client.setRecoveryCommercialUsername(primaryUsername);
            }
            clientRepository.save(client);
        });
    }

    private void recordHistory(ClientCommercialAssignment assignment, CommercialAssignmentEventType eventType,
                               CommercialAssignmentStatus prevStatus, CommercialAssignmentStatus newStatus,
                               boolean wasPrimary, boolean isPrimary, String replacedBy, String reason, String actor) {
        ClientCommercialAssignmentHistory h = new ClientCommercialAssignmentHistory();
        h.setAssignmentId(assignment.getId());
        h.setClientId(assignment.getClientId());
        h.setCommercialUsername(assignment.getCommercialUsername());
        h.setActivityType(assignment.getActivityType());
        h.setEventType(eventType);
        h.setPreviousStatus(prevStatus);
        h.setNewStatus(newStatus);
        h.setWasPrimary(wasPrimary);
        h.setPrimary(isPrimary);
        h.setReplacedByCommercialUsername(replacedBy);
        h.setReason(reason);
        h.setPerformedBy(actor);
        h.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        historyRepository.save(h);
    }

    private static String scalarCommercial(Client client, PortfolioActivityType activityType) {
        if (client == null || activityType == null) {
            return null;
        }
        return switch (activityType) {
            case CREDIT -> client.getCreditCommercialUsername();
            case TONTINE -> client.getTontineCommercialUsername();
            case AGENCY -> client.getAgencyCommercialUsername();
            case RECOVERY -> client.getRecoveryCommercialUsername();
        };
    }

    private static List<PortfolioActivityType> resolveActivities(List<PortfolioActivityType> requested) {
        if (requested == null || requested.isEmpty()) {
            return List.of(PortfolioActivityType.CREDIT, PortfolioActivityType.TONTINE);
        }
        return requested;
    }

    private static void requireTargetCommercial(String target) {
        if (!StringUtils.hasText(target)) {
            throw new CustomValidationException("Le commercial cible est obligatoire pour cette opération.");
        }
    }

    private static void requireSourceCommercial(String source) {
        if (!StringUtils.hasText(source)) {
            throw new CustomValidationException("Le commercial source est obligatoire pour cette opération.");
        }
    }

    private String currentActor() {
        try {
            if (userService != null && userService.getCurrentUser() != null) {
                return userService.getCurrentUser().getUsername();
            }
        } catch (RuntimeException ignored) {
        }
        return "system";
    }
}
