package com.optimize.elykia.tontine.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.api.CommercialAssignmentStatus;
import com.optimize.elykia.client.api.PortfolioActivityType;
import com.optimize.elykia.client.application.ClientCommercialPortfolioService;
import com.optimize.elykia.tontine.domain.TontineMember;
import com.optimize.elykia.tontine.domain.TontineMemberCommercialAssignment;
import com.optimize.elykia.tontine.domain.TontineMemberStewardshipRole;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineCollectionRepository;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineMemberCommercialAssignmentRepository;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Gestion des mandats et relais de commerciaux sur les carnets tontine ({@link TontineMember}),
 * à l'unité ou en masse (Bulk par commercial source ou liste de carnets), synchronisée avec le portefeuille client.
 */
@Service
@Transactional
public class TontineMemberRelayService {

    private final TontineMemberCommercialAssignmentRepository assignmentRepository;
    private final TontineMemberRepository memberRepository;
    private final TontineCollectionRepository collectionRepository;
    private final ClientCommercialPortfolioService clientPortfolioService;
    private final UserService userService;

    public TontineMemberRelayService(TontineMemberCommercialAssignmentRepository assignmentRepository,
                                     TontineMemberRepository memberRepository,
                                     TontineCollectionRepository collectionRepository,
                                     ClientCommercialPortfolioService clientPortfolioService,
                                     UserService userService) {
        this.assignmentRepository = assignmentRepository;
        this.memberRepository = memberRepository;
        this.collectionRepository = collectionRepository;
        this.clientPortfolioService = clientPortfolioService;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<TontineMemberCommercialAssignment> listStewardship(Long memberId) {
        return assignmentRepository.findByTontineMemberIdOrderByStatusAscEffectiveFromAscIdAsc(memberId);
    }

    @Transactional(readOnly = true)
    public boolean canCommercialOperateOnMember(String commercialUsername, TontineMember member) {
        if (!StringUtils.hasText(commercialUsername) || member == null) {
            return false;
        }
        if (assignmentRepository.existsByTontineMemberIdAndCommercialUsernameIgnoreCaseAndStatus(
                member.getId(), commercialUsername, CommercialAssignmentStatus.ACTIVE)) {
            return true;
        }
        if (member.getClient() != null) {
            return clientPortfolioService.isCommercialActiveOnClient(
                    commercialUsername, member.getClient().getId(), PortfolioActivityType.TONTINE);
        }
        return false;
    }

    /**
     * Passe le relais (ou ajoute un co-collecteur actif / réactive un commercial) sur un carnet tontine.
     * Si {@code handoverFromExisting} est vrai, les mandats actuellement {@code ACTIVE} passent à {@code INACTIVE}
     * avec snapshot de leurs cotisations déjà collectées (qu'ils continuent de consulter en lecture seule).
     */
    public TontineMemberCommercialAssignment assignOrRelayMember(Long memberId, String targetCommercialUsername,
                                                                 boolean handoverFromExisting, String reason) {
        if (memberId == null || !StringUtils.hasText(targetCommercialUsername)) {
            throw new CustomValidationException("Carnet tontine et commercial cible sont obligatoires.");
        }
        TontineMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomValidationException("Membre de tontine introuvable : " + memberId));
        String target = targetCommercialUsername.trim();
        String actor = currentActor();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        List<TontineMemberCommercialAssignment> existing = assignmentRepository
                .findByTontineMemberIdOrderByStatusAscEffectiveFromAscIdAsc(memberId);

        if (handoverFromExisting) {
            for (TontineMemberCommercialAssignment current : existing) {
                if (current.isActive() && !current.getCommercialUsername().equalsIgnoreCase(target)) {
                    current.setStatus(CommercialAssignmentStatus.INACTIVE);
                    current.setEffectiveTo(today);
                    current.setUpdatedAt(now);
                    refreshSnapshot(current);
                    assignmentRepository.save(current);
                }
            }
        }

        TontineMemberCommercialAssignment mandate = assignmentRepository
                .findByTontineMemberIdAndCommercialUsernameIgnoreCase(memberId, target)
                .orElseGet(() -> {
                    TontineMemberCommercialAssignment created = new TontineMemberCommercialAssignment();
                    created.setTontineMemberId(memberId);
                    created.setCommercialUsername(target);
                    created.setRole(existing.isEmpty() ? TontineMemberStewardshipRole.INITIATOR
                            : (handoverFromExisting ? TontineMemberStewardshipRole.RELAY
                            : TontineMemberStewardshipRole.CO_COLLECTOR));
                    created.setEffectiveFrom(today);
                    created.setCreatedAt(now);
                    return created;
                });

        mandate.setStatus(CommercialAssignmentStatus.ACTIVE);
        mandate.setEffectiveTo(null);
        mandate.setAssignedBy(actor);
        mandate.setReason(reason);
        mandate.setUpdatedAt(now);
        refreshSnapshot(mandate);
        mandate = assignmentRepository.save(mandate);

        if (member.getClient() != null) {
            clientPortfolioService.assignOrRelay(member.getClient().getId(), target, PortfolioActivityType.TONTINE,
                    handoverFromExisting, handoverFromExisting, reason);
        }
        return mandate;
    }

    /** Relais ou co-affectation en masse sur tous les carnets d'un commercial source ou d'une liste de membres. */
    public int bulkRelayMembers(String sourceCommercialUsername, String targetCommercialUsername,
                                List<Long> memberIds, boolean handoverFromExisting, String reason) {
        if (!StringUtils.hasText(targetCommercialUsername)) {
            throw new CustomValidationException("Le commercial cible est obligatoire.");
        }
        Set<Long> targetMemberIds = new LinkedHashSet<>();
        if (memberIds != null && !memberIds.isEmpty()) {
            targetMemberIds.addAll(memberIds);
        } else if (StringUtils.hasText(sourceCommercialUsername)) {
            assignmentRepository.findByCommercialUsernameIgnoreCaseAndStatus(
                            sourceCommercialUsername.trim(), CommercialAssignmentStatus.ACTIVE)
                    .forEach(a -> targetMemberIds.add(a.getTontineMemberId()));
        } else {
            throw new CustomValidationException(
                    "Veuillez indiquer le commercial source ou la liste des carnets tontine.");
        }
        for (Long id : targetMemberIds) {
            assignOrRelayMember(id, targetCommercialUsername, handoverFromExisting, reason);
        }
        return targetMemberIds.size();
    }

    private void refreshSnapshot(TontineMemberCommercialAssignment mandate) {
        collectionRepository.sumContributionsByMemberAndCommercial(mandate.getTontineMemberId(), State.ENABLED)
                .stream()
                .filter(row -> mandate.getCommercialUsername().equalsIgnoreCase(row.getCommercialUsername()))
                .findFirst()
                .ifPresent(row -> {
                    mandate.setCollectionsCountSnapshot(row.getCollectionsCount());
                    mandate.setCollectionsAmountSnapshot(row.getTotalAmount());
                });
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
