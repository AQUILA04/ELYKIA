package com.optimize.elykia.tontine.application;

import com.optimize.elykia.tontine.web.dto.TontineDeliveryConflictDto;
import com.optimize.elykia.tontine.domain.TontineDelivery;
import com.optimize.elykia.tontine.domain.TontineDeliveryConflict;
import com.optimize.elykia.tontine.domain.TontineMember;
import com.optimize.elykia.tontine.domain.TontineDeliveryConflictOperation;
import com.optimize.elykia.tontine.domain.TontineDeliveryConflictOutcome;
import com.optimize.elykia.tontine.domain.TontineDeliveryConflictReason;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineDeliveryConflictRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Journal des secondes saisies (commande ou livraison) pour un membre tontine.
 * <p>
 * Chaque écriture a sa propre transaction : un refus annule la transaction appelante,
 * mais la trace doit rester pour le gestionnaire. Une même saisie rejouée par la synchronisation
 * incrémente {@code attempts} au lieu d'ajouter une ligne.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TontineDeliveryConflictService {

    static final String DEVICE_HEADER = "X-Device-Id";
    private static final LocalDate MIN_DATE = LocalDate.of(2000, 1, 1);
    private static final LocalDate MAX_DATE = LocalDate.of(2999, 12, 31);

    private final TontineDeliveryConflictRepository conflictRepository;

    /** Saisie entrante, décrite à plat pour le journal. */
    public record Incoming(TontineDeliveryConflictOperation operation, String reference, Double amount,
                           String items, String authenticityCode) {
        public Incoming(TontineDeliveryConflictOperation operation, String reference, Double amount, String items) {
            this(operation, reference, amount, items, null);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(TontineMember member,
                       TontineDelivery existing,
                       Incoming incoming,
                       TontineDeliveryConflictOutcome outcome,
                       TontineDeliveryConflictReason reason) {
        LocalDateTime now = LocalDateTime.now();
        String reference = StringUtils.hasText(incoming.reference()) ? incoming.reference().trim() : null;
        TontineDeliveryConflict conflict = reference == null
                ? null
                : conflictRepository
                        .findFirstByTontineMemberIdAndOperationAndIncomingReferenceOrderByIdDesc(
                                member.getId(), incoming.operation(), reference)
                        .filter(previous -> previous.getOutcome() == outcome && previous.getReason() == reason)
                        .orElse(null);

        if (conflict == null) {
            conflict = new TontineDeliveryConflict();
            conflict.setTontineMemberId(member.getId());
            conflict.setTontineSessionId(member.getTontineSession() != null ? member.getTontineSession().getId() : null);
            conflict.setClientName(member.getClient() != null ? member.getClient().getFullName() : null);
            conflict.setCommercialUsername(member.getClient() != null ? member.getClient().getCollector() : null);
            conflict.setOperation(incoming.operation());
            conflict.setOutcome(outcome);
            conflict.setReason(reason);
            conflict.setIncomingReference(reference);
            conflict.setFirstSeenAt(now);
            conflict.setAttempts(1);
        } else {
            conflict.setAttempts((conflict.getAttempts() != null ? conflict.getAttempts() : 0) + 1);
        }

        if (StringUtils.hasText(incoming.authenticityCode())) {
            conflict.setIncomingAuthenticityCode(normalizeCode(incoming.authenticityCode()));
        }
        conflict.setIncomingAmount(incoming.amount());
        conflict.setIncomingItems(incoming.items());
        conflict.setAvailableBalance(member.getAvailableContribution());
        if (existing != null) {
            conflict.setExistingDeliveryId(existing.getId());
            conflict.setExistingReference(existing.getReference());
            conflict.setExistingAmount(existing.getTotalAmount());
            conflict.setExistingDeliveryDate(existing.getDeliveryDate());
        }
        String device = currentDeviceId();
        if (device != null) {
            conflict.setDeviceId(device);
        }
        conflict.setLastSeenAt(now);
        conflictRepository.save(conflict);
        log.warn("Doublon tontine {} / {} ({}) pour le membre {}, référence entrante {}",
                incoming.operation(), outcome, reason, member.getId(), reference);
    }

    /** Vrai si cette saisie a déjà été fusionnée : la synchronisation la rejoue sans rien ajouter. */
    @Transactional(readOnly = true)
    public boolean wasAlreadyMerged(Long memberId, String incomingReference) {
        if (memberId == null || !StringUtils.hasText(incomingReference)) {
            return false;
        }
        return conflictRepository.existsByTontineMemberIdAndIncomingReferenceAndOutcome(
                memberId, incomingReference.trim(), TontineDeliveryConflictOutcome.MERGED);
    }

    /**
     * Commande dans laquelle a été fusionnée la saisie dont le reçu porte ce code.
     * Le reçu imprimé par le second téléphone reste ainsi vérifiable.
     */
    @Transactional(readOnly = true)
    public java.util.Optional<Long> mergedDeliveryIdForReceiptCode(String code) {
        if (!StringUtils.hasText(code)) {
            return java.util.Optional.empty();
        }
        return conflictRepository
                .findFirstByIncomingAuthenticityCodeAndOutcomeOrderByIdDesc(normalizeCode(code), TontineDeliveryConflictOutcome.MERGED)
                .map(TontineDeliveryConflict::getExistingDeliveryId);
    }

    private static String normalizeCode(String code) {
        return code.trim().toUpperCase(java.util.Locale.ROOT).replace(" ", "");
    }

    @Transactional(readOnly = true)
    public Page<TontineDeliveryConflictDto> search(LocalDate dateFrom, LocalDate dateTo, String commercial,
                                                   TontineDeliveryConflictOutcome outcome, Pageable pageable) {
        LocalDateTime from = (dateFrom != null ? dateFrom : MIN_DATE).atStartOfDay();
        LocalDateTime to = (dateTo != null ? dateTo : MAX_DATE).atTime(LocalTime.MAX);
        String commercialFilter = StringUtils.hasText(commercial) ? commercial.trim() : null;
        return conflictRepository.search(from, to, commercialFilter, outcome, pageable).map(TontineDeliveryConflictService::toDto);
    }

    static TontineDeliveryConflictDto toDto(TontineDeliveryConflict c) {
        return TontineDeliveryConflictDto.builder()
                .id(c.getId())
                .tontineMemberId(c.getTontineMemberId())
                .tontineSessionId(c.getTontineSessionId())
                .clientName(c.getClientName())
                .commercialUsername(c.getCommercialUsername())
                .existingDeliveryId(c.getExistingDeliveryId())
                .existingReference(c.getExistingReference())
                .existingAmount(c.getExistingAmount())
                .existingDeliveryDate(c.getExistingDeliveryDate())
                .incomingReference(c.getIncomingReference())
                .incomingAmount(c.getIncomingAmount())
                .incomingItems(c.getIncomingItems())
                .availableBalance(c.getAvailableBalance())
                .operation(c.getOperation())
                .outcome(c.getOutcome())
                .reason(c.getReason())
                .deviceId(c.getDeviceId())
                .recordedBy(c.getCreatedBy())
                .attempts(c.getAttempts())
                .firstSeenAt(c.getFirstSeenAt())
                .lastSeenAt(c.getLastSeenAt())
                .build();
    }

    private static String currentDeviceId() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return null;
        }
        HttpServletRequest request = attributes.getRequest();
        String value = request.getHeader(DEVICE_HEADER);
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
