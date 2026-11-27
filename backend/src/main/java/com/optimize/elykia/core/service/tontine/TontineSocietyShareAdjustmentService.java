package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.AdjustTontineSocietyShareDto;
import com.optimize.elykia.core.dto.TontineSocietyShareAdjustmentDto;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSocietyShareAdjustment;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.enumaration.TontineSocietyShareAdjustmentOutcome;
import com.optimize.elykia.core.enumaration.TontineSocietyShareAdjustmentSource;
import com.optimize.elykia.core.enumaration.TontineSocietyShareStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSocietyShareAdjustmentRepository;
import com.optimize.elykia.core.service.tontine.allocation.TontineBalanceTopUp;
import com.optimize.elykia.core.service.tontine.allocation.TontineProjectedBalanceCalculator;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Réajustement de la part société d'un membre tontine.
 * <p>
 * Le montant saisi est la part société réelle sur toute l'année. Egal à la part en place (à 1 FCFA près) :
 * rien ne change, la part est confirmée. Différent : il remplace le calcul automatique, le solde disponible
 * et la commande en attente sont recalculés tout de suite. Le chef de recouvrement (ou un administrateur)
 * prime : après sa validation ou sa correction, la saisie d'un commercial est refusée.
 * Un membre déjà livré est en lecture seule ; sans collecte, il n'y a pas de réajustement.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class TontineSocietyShareAdjustmentService {

    static final double TOLERANCE = 1.0;
    private static final String RECOVERY_MANAGER = "RECOVERY_MANAGER";

    private final TontineMemberRepository memberRepository;
    private final TontineCollectionRepository collectionRepository;
    private final TontineSocietyShareAdjustmentRepository adjustmentRepository;
    private final TontineDeliveryRepository deliveryRepository;
    private final TontineService tontineService;
    private final UserService userService;
    private final TontineProjectedBalanceCalculator projectedBalanceCalculator;

    /** Saisie depuis une fiche membre (web, mobile) ou le contrôle du chef de recouvrement. */
    public TontineSocietyShareAdjustmentDto adjust(Long memberId, AdjustTontineSocietyShareDto dto) {
        TontineMember member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Membre de tontine non trouvé"));
        return apply(member, dto, null, true);
    }

    /**
     * Saisie faite pendant l'enregistrement d'une commande : appliquée avant le contrôle du plafond,
     * dans la même transaction. Une saisie de commercial sur une part déjà validée par le chef de
     * recouvrement est inscrite comme refusée et la commande continue avec la part du chef de recouvrement.
     */
    public TontineSocietyShareAdjustmentDto adjustForDelivery(TontineMember member,
                                                              AdjustTontineSocietyShareDto dto,
                                                              String deliveryReference) {
        if (dto == null || dto.getDeclaredSocietyShare() == null) {
            return null;
        }
        if (dto.getSource() == null) {
            dto.setSource(TontineSocietyShareAdjustmentSource.DELIVERY_CREATION);
        }
        TontineMember locked = memberRepository.findByIdForUpdate(member.getId()).orElse(member);
        return apply(locked, dto, deliveryReference, false);
    }

    /** Retour au calcul automatique (administrateur). */
    public TontineSocietyShareAdjustmentDto reset(Long memberId, String comment) {
        TontineMember member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Membre de tontine non trouvé"));
        requireEditable(member);
        User user = userService.getCurrentUser();
        double previous = nz(member.getSocietyShare());
        double previousAvailable = nz(member.getAvailableContribution());

        member.setSocietyShareOverride(null);
        member.setSocietyShareStatus(TontineSocietyShareStatus.AUTO);
        member.setSocietyShareLocked(Boolean.FALSE);
        member.setSocietyShareReviewedAt(LocalDateTime.now());
        member.setSocietyShareReviewedBy(user != null ? user.getUsername() : null);
        tontineService.recalculateMemberAfterSocietyShareChange(member);
        refreshPendingDelivery(member);

        TontineSocietyShareAdjustment saved = record(member, null, null, TontineSocietyShareAdjustmentSource.ADMIN_RESET,
                TontineSocietyShareAdjustmentOutcome.RESET, true, regularTotal(member), previous, null,
                previousAvailable, comment, user);
        return response(saved, member, "Part société rendue au calcul automatique : "
                + TontineDeliveryService.formatAmount(member.getSocietyShare()) + " FCFA.");
    }

    @Transactional(readOnly = true)
    public List<TontineSocietyShareAdjustmentDto> history(Long memberId) {
        return adjustmentRepository.findByTontineMemberIdOrderByAdjustedAtDescIdDesc(memberId).stream()
                .map(TontineSocietyShareAdjustmentDto::from)
                .toList();
    }

    private TontineSocietyShareAdjustmentDto apply(TontineMember member,
                                                   AdjustTontineSocietyShareDto dto,
                                                   String deliveryReference,
                                                   boolean strict) {
        String reference = StringUtils.hasText(dto.getReference()) ? dto.getReference().trim() : null;
        if (reference != null) {
            Optional<TontineSocietyShareAdjustment> replay = adjustmentRepository.findFirstByReference(reference);
            if (replay.isPresent()) {
                // Même saisie renvoyée par la synchronisation : elle est déjà enregistrée.
                return response(replay.get(), member, messageOf(replay.get(), member));
            }
        }

        User user = userService.getCurrentUser();
        boolean supervisor = isSupervisor(user);
        requireEditable(member);
        requireOwnMember(member, user, supervisor);

        double regular = regularTotal(member);
        if (regular <= 0.0) {
            throw new CustomValidationException(
                    "Aucune collecte enregistrée pour ce membre : il n'y a pas de part société à réajuster.");
        }
        double declared = Math.round(dto.getDeclaredSocietyShare());
        if (declared < 0) {
            throw new CustomValidationException("La part société ne peut pas être négative.");
        }
        if (declared > regular + TOLERANCE) {
            throw new CustomValidationException(String.format(
                    "La part société saisie (%s FCFA) dépasse le total cotisé par ce membre (%s FCFA).",
                    TontineDeliveryService.formatAmount(declared), TontineDeliveryService.formatAmount(regular)));
        }

        TontineSocietyShareAdjustmentSource source = dto.getSource() != null
                ? dto.getSource()
                : (supervisor ? TontineSocietyShareAdjustmentSource.RM_CONTROL : TontineSocietyShareAdjustmentSource.WEB_MEMBER);
        double previous = nz(member.getSocietyShare());
        double previousAvailable = nz(member.getAvailableContribution());

        if (!supervisor && Boolean.TRUE.equals(member.getSocietyShareLocked())) {
            String message = "Le chef de recouvrement a déjà validé la part société de ce membre : "
                    + "votre saisie n'est pas prise en compte.";
            if (strict) {
                throw new CustomValidationException(message);
            }
            TontineSocietyShareAdjustment rejected = record(member, reference, deliveryReference, source,
                    TontineSocietyShareAdjustmentOutcome.REJECTED, false, regular, previous, declared,
                    previousAvailable, dto.getComment(), user);
            return response(rejected, member, message);
        }

        LocalDateTime now = LocalDateTime.now();
        member.setSocietyShareReviewedAt(now);
        member.setSocietyShareReviewedBy(user != null ? user.getUsername() : null);
        if (supervisor) {
            member.setSocietyShareLocked(Boolean.TRUE);
        }

        TontineSocietyShareAdjustmentOutcome outcome;
        if (Math.abs(declared - previous) < TOLERANCE) {
            // Conforme : l'existant est validé, aucune mise à jour des montants.
            outcome = TontineSocietyShareAdjustmentOutcome.VALIDATED;
            if (member.getSocietyShareStatus() == null || member.getSocietyShareStatus() == TontineSocietyShareStatus.AUTO) {
                member.setSocietyShareStatus(TontineSocietyShareStatus.CONFIRMED);
            }
            memberRepository.save(member);
        } else {
            outcome = TontineSocietyShareAdjustmentOutcome.ADJUSTED;
            member.setSocietyShareOverride(declared);
            member.setSocietyShareStatus(TontineSocietyShareStatus.ADJUSTED);
            tontineService.recalculateMemberAfterSocietyShareChange(member);
            refreshPendingDelivery(member);
        }

        TontineSocietyShareAdjustment saved = record(member, reference, deliveryReference, source, outcome,
                supervisor, regular, previous, declared, previousAvailable, dto.getComment(), user);
        log.info("Society share of member {} {} by {} ({} -> {}).", member.getId(), outcome,
                saved.getAdjustedBy(), previous, member.getSocietyShare());
        return response(saved, member, messageOf(saved, member));
    }

    /** Commande en attente : reliquat, plafond et statut suivent la nouvelle part société. */
    private void refreshPendingDelivery(TontineMember member) {
        Optional<TontineDelivery> pending = deliveryRepository.findByTontineMemberId(member.getId());
        if (pending.isEmpty() || member.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED) {
            return;
        }
        TontineDelivery delivery = pending.get();
        double total = nz(delivery.getTotalAmount());
        double available = nz(member.getAvailableContribution());
        double projected = projectedBalanceCalculator.project(member);
        delivery.setRemainingBalance(Math.max(0.0, available - total));
        delivery.setProjectedBalance(projected);
        if (TontineProjectedBalanceCalculator.exceeds(total, projected)
                && member.getDeliveryStatus() == TontineMemberDeliveryStatus.VALIDATED) {
            // La commande dépasse le nouveau plafond : elle repasse en attente pour être réduite.
            member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
            memberRepository.save(member);
        }
        deliveryRepository.save(delivery);
    }

    private void requireEditable(TontineMember member) {
        if (member.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED) {
            throw new CustomValidationException("Ce membre est déjà livré : sa fiche est en lecture seule.");
        }
        if (member.getTontineSession() != null
                && member.getTontineSession().getStatus() == TontineSessionStatus.ENDED) {
            throw new CustomValidationException("La session tontine est terminée : la part société ne peut plus être modifiée.");
        }
    }

    private void requireOwnMember(TontineMember member, User user, boolean supervisor) {
        if (supervisor || user == null || !user.is(UserProfilConstant.PROMOTER)) {
            return;
        }
        String collector = member.getClient() != null ? member.getClient().getTontineCollector() : null;
        if (collector == null || !collector.trim().equalsIgnoreCase(user.getUsername())) {
            throw new CustomValidationException("Ce membre n'appartient pas à votre portefeuille tontine.");
        }
    }

    static boolean isSupervisor(User user) {
        return user != null && (user.is(RECOVERY_MANAGER)
                || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.SU));
    }

    private double regularTotal(TontineMember member) {
        List<TontineCollection> enabled = collectionRepository
                .findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(member.getId(), State.ENABLED);
        double total = 0.0;
        for (TontineCollection collection : TontineBalanceTopUp.regular(enabled)) {
            total += nz(collection.getAmount());
        }
        return total;
    }

    private TontineSocietyShareAdjustment record(TontineMember member,
                                                 String reference,
                                                 String deliveryReference,
                                                 TontineSocietyShareAdjustmentSource source,
                                                 TontineSocietyShareAdjustmentOutcome outcome,
                                                 boolean supervisor,
                                                 double regular,
                                                 double previous,
                                                 Double declared,
                                                 double previousAvailable,
                                                 String comment,
                                                 User user) {
        boolean changed = outcome == TontineSocietyShareAdjustmentOutcome.ADJUSTED
                || outcome == TontineSocietyShareAdjustmentOutcome.RESET;
        double current = nz(member.getSocietyShare());
        TontineSocietyShareAdjustment a = new TontineSocietyShareAdjustment();
        a.setTontineMemberId(member.getId());
        a.setTontineSessionId(member.getTontineSession() != null ? member.getTontineSession().getId() : null);
        a.setClientName(member.getClient() != null ? member.getClient().getFullName() : null);
        a.setCommercialUsername(member.getClient() != null ? member.getClient().getTontineCollector() : null);
        a.setReference(reference);
        a.setDeliveryReference(deliveryReference);
        a.setSource(source);
        a.setOutcome(outcome);
        a.setSupervisor(supervisor);
        a.setRegularContribution(regular);
        a.setComputedSocietyShare(member.getSocietyShareComputed() != null ? member.getSocietyShareComputed() : previous);
        a.setPreviousSocietyShare(previous);
        a.setDeclaredSocietyShare(declared);
        a.setNewSocietyShare(changed ? current : previous);
        a.setDelta(changed ? current - previous : 0.0);
        a.setPreviousAvailable(previousAvailable);
        a.setNewAvailable(nz(member.getAvailableContribution()));
        a.setComment(StringUtils.hasText(comment) ? comment.trim() : null);
        a.setAdjustedBy(user != null ? user.getUsername() : null);
        a.setAdjustedAt(LocalDateTime.now());
        return adjustmentRepository.save(a);
    }

    private TontineSocietyShareAdjustmentDto response(TontineSocietyShareAdjustment saved,
                                                      TontineMember member,
                                                      String message) {
        TontineSocietyShareAdjustmentDto dto = TontineSocietyShareAdjustmentDto.from(saved);
        dto.setMemberSocietyShareStatus(member.getSocietyShareStatus());
        dto.setMemberSocietyShareLocked(Boolean.TRUE.equals(member.getSocietyShareLocked()));
        dto.setMemberSocietyShare(nz(member.getSocietyShare()));
        dto.setMemberAvailableContribution(nz(member.getAvailableContribution()));
        dto.setMemberProjectedBalance(projectedBalanceCalculator.project(member));
        dto.setMessage(message);
        return dto;
    }

    private static String messageOf(TontineSocietyShareAdjustment a, TontineMember member) {
        String available = TontineDeliveryService.formatAmount(member.getAvailableContribution());
        return switch (a.getOutcome()) {
            case VALIDATED -> "Part société conforme : elle est validée. Solde disponible : " + available + " FCFA.";
            case ADJUSTED -> "Part société corrigée. Nouveau solde disponible : " + available + " FCFA.";
            case REJECTED -> "Le chef de recouvrement a déjà validé la part société de ce membre : "
                    + "votre saisie n'est pas prise en compte.";
            case RESET -> "Part société rendue au calcul automatique.";
        };
    }

    private static double nz(Double value) {
        return value != null ? value : 0.0;
    }
}
