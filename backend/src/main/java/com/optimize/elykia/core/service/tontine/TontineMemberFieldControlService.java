package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.dto.CreateTontineMemberFieldControlDto;
import com.optimize.elykia.core.dto.CreateTontineMemberFieldControlMonthDto;
import com.optimize.elykia.core.dto.TontineMemberFieldControlCollectorDto;
import com.optimize.elykia.core.dto.TontineMemberFieldControlDto;
import com.optimize.elykia.core.dto.TontineMemberFieldControlLineDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControlLine;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy;
import com.optimize.elykia.core.service.carnet.CarnetVerificationSupport;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy.EcartDecisionView;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TontineMemberFieldControlService {

    public static final String AUTO_VERIFY_PARAMETER_KEY = "TONTINE_AUTO_VERIFY_ON_FIELD_CONTROL";

    private static final double EPSILON = 0.0001d;
    /** Mois calendaires de la session tontine : février (2) → novembre (11). */
    private static final Set<Integer> TONTINE_CALENDAR_MONTHS = Set.of(2, 3, 4, 5, 6, 7, 8, 9, 10, 11);

    private final TontineMemberFieldControlRepository repository;
    private final TontineMemberRepository tontineMemberRepository;
    private final TontineCollectionRepository tontineCollectionRepository;
    private final CarnetEcartRecontrolPolicy recontrolPolicy;
    private final ParameterService parameterService;
    private AppNotificationService appNotificationService;

    @Autowired(required = false)
    public void setAppNotificationService(AppNotificationService appNotificationService) {
        this.appNotificationService = appNotificationService;
    }

    @Transactional
    public TontineMemberFieldControlDto create(Long memberId, CreateTontineMemberFieldControlDto dto) {
        String reference = dto.getReference() != null ? dto.getReference().trim() : null;
        if (StringUtils.hasText(reference) && repository.existsByReference(reference)) {
            return toDto(repository.findByReference(reference).orElseThrow(), memberId);
        }

        TontineMember member = tontineMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("tontine.member.not.found"));

        if (dto.getMonths() == null || dto.getMonths().isEmpty()) {
            throw new CustomValidationException("Au moins un mois doit être renseigné.");
        }

        Set<String> seen = new HashSet<>();
        for (CreateTontineMemberFieldControlMonthDto monthDto : dto.getMonths()) {
            if (!TONTINE_CALENDAR_MONTHS.contains(monthDto.getMonth())) {
                throw new CustomValidationException(
                        "Le mois " + monthDto.getMonth() + " n'est pas un mois de session tontine (février–novembre).");
            }
            String commercial = normalizeCommercial(monthDto.getCommercialUsername());
            if (!StringUtils.hasText(commercial)) {
                throw new CustomValidationException("Le commercial est obligatoire pour chaque mois contrôlé.");
            }
            monthDto.setCommercialUsername(commercial);
            String key = commercial.toLowerCase(Locale.ROOT) + "|" + monthDto.getYear() + "-" + monthDto.getMonth();
            if (!seen.add(key)) {
                throw new CustomValidationException(
                        "Le mois " + monthDto.getYear() + "-" + monthDto.getMonth()
                                + " est saisi en double pour " + commercial + ".");
            }
        }

        List<TontineCollection> collections = tontineCollectionRepository
                .findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(memberId, State.ENABLED);
        List<TontineMemberFieldControlLine> desiredLines = buildLines(dto.getMonths(), collections);
        LocalDateTime observedAt = dto.getObservedAt() != null ? dto.getObservedAt() : LocalDateTime.now();
        String observedBy = SecurityContextHolder.getContext().getAuthentication().getName();

        TontineMemberFieldControl saved;
        TontineMemberFieldControl latest = findLatest(memberId).orElse(null);
        if (latest != null && recontrolPolicy != null && recontrolPolicy.mustModifyTontine(latest)) {
            rewriteControl(latest, reference, observedAt, observedBy, dto.getNote(), desiredLines);
            saved = repository.save(latest);
        } else {
            TontineMemberFieldControl entity = new TontineMemberFieldControl();
            entity.setTontineMember(member);
            entity.setReference(reference);
            entity.setObservedAt(observedAt);
            entity.setObservedBy(observedBy);
            entity.setNote(dto.getNote());
            for (TontineMemberFieldControlLine line : desiredLines) {
                entity.addLine(line);
            }
            applyTotals(entity);
            saved = repository.save(entity);
        }

        maybeAutoVerify(member, observedBy);
        notifyEcart(saved, member);
        return toDto(saved, memberId);
    }

    /**
     * Lorsque le paramètre est activé, le contrôle terrain certifie aussi le carnet
     * de la session active. Désactivé, seul le contrôle est conservé.
     */
    private void maybeAutoVerify(TontineMember member, String observedBy) {
        if (member == null || Boolean.TRUE.equals(member.getCarnetVerified()) || parameterService == null) {
            return;
        }
        if (!parameterService.isEnabled(AUTO_VERIFY_PARAMETER_KEY)) {
            return;
        }
        TontineSession session = member.getTontineSession();
        if (session == null
                || session.getStatus() != TontineSessionStatus.ACTIVE
                || session.getYear() == null
                || session.getYear() != LocalDate.now().getYear()) {
            log.info("Contrôle enregistré sans vérification automatique du carnet pour le membre {}", member.getId());
            return;
        }
        CarnetVerificationSupport.apply(member, true, observedBy, LocalDateTime.now());
        tontineMemberRepository.save(member);
    }

    private Optional<TontineMemberFieldControl> findLatest(Long memberId) {
        Optional<TontineMemberFieldControl> found = repository
                .findFirstByTontineMember_idAndStateOrderByObservedAtDesc(memberId, State.ENABLED);
        return found != null ? found : Optional.empty();
    }

    private List<TontineMemberFieldControlLine> buildLines(
            List<CreateTontineMemberFieldControlMonthDto> months,
            List<TontineCollection> collections) {
        List<TontineMemberFieldControlLine> lines = new ArrayList<>();
        for (CreateTontineMemberFieldControlMonthDto monthDto : months) {
            String commercial = monthDto.getCommercialUsername();
            double systemAmount = sumCollectionsForMonth(
                    collections, monthDto.getYear(), monthDto.getMonth(), commercial);
            double notebookAmount = monthDto.getNotebookAmount() != null ? monthDto.getNotebookAmount() : 0d;
            TontineMemberFieldControlLine line = new TontineMemberFieldControlLine();
            line.setYear(monthDto.getYear());
            line.setMonth(monthDto.getMonth());
            line.setCommercialUsername(commercial);
            line.setNotebookAmount(notebookAmount);
            line.setSystemAmount(systemAmount);
            line.setDifferenceAmount(notebookAmount - systemAmount);
            lines.add(line);
        }
        return lines;
    }

    private void rewriteControl(
            TontineMemberFieldControl entity,
            String reference,
            LocalDateTime observedAt,
            String observedBy,
            String note,
            List<TontineMemberFieldControlLine> desiredLines) {
        Set<Long> lockedIds = recontrolPolicy != null
                ? recontrolPolicy.terminalTontineLineIds(entity)
                : Set.of();
        if (lockedIds == null) {
            lockedIds = Set.of();
        }
        Set<String> lockedKeys = new HashSet<>();
        if (entity.getLines() != null) {
            for (TontineMemberFieldControlLine line : entity.getLines()) {
                if (line.getId() != null && lockedIds.contains(line.getId())) {
                    lockedKeys.add(lineKey(line.getCommercialUsername(), line.getYear(), line.getMonth()));
                }
            }
        }

        if (lockedKeys.isEmpty()) {
            entity.getLines().clear();
            for (TontineMemberFieldControlLine line : desiredLines) {
                entity.addLine(line);
            }
        } else {
            Set<String> desiredKeys = desiredLines.stream()
                    .map(line -> lineKey(line.getCommercialUsername(), line.getYear(), line.getMonth()))
                    .collect(Collectors.toCollection(HashSet::new));
            entity.getLines().removeIf(line -> {
                String key = lineKey(line.getCommercialUsername(), line.getYear(), line.getMonth());
                return !lockedKeys.contains(key) && !desiredKeys.contains(key);
            });
            for (TontineMemberFieldControlLine desired : desiredLines) {
                String key = lineKey(desired.getCommercialUsername(), desired.getYear(), desired.getMonth());
                if (lockedKeys.contains(key)) {
                    continue;
                }
                TontineMemberFieldControlLine existing = entity.getLines().stream()
                        .filter(line -> key.equals(lineKey(
                                line.getCommercialUsername(), line.getYear(), line.getMonth())))
                        .findFirst()
                        .orElse(null);
                if (existing != null) {
                    existing.setNotebookAmount(desired.getNotebookAmount());
                    existing.setSystemAmount(desired.getSystemAmount());
                    existing.setDifferenceAmount(desired.getDifferenceAmount());
                    existing.setCommercialUsername(desired.getCommercialUsername());
                } else {
                    entity.addLine(desired);
                }
            }
        }

        entity.setReference(reference);
        entity.setObservedAt(observedAt);
        entity.setObservedBy(observedBy);
        entity.setNote(note);
        applyTotals(entity);
    }

    private void applyTotals(TontineMemberFieldControl entity) {
        double notebookTotal = 0d;
        double systemTotal = 0d;
        for (TontineMemberFieldControlLine line : entity.getLines()) {
            notebookTotal += line.getNotebookAmount() != null ? line.getNotebookAmount() : 0d;
            systemTotal += line.getSystemAmount() != null ? line.getSystemAmount() : 0d;
        }
        entity.setNotebookTotalAmount(notebookTotal);
        entity.setSystemTotalAmount(systemTotal);
        entity.setDifferenceAmount(notebookTotal - systemTotal);
        entity.setStatus(Math.abs(notebookTotal - systemTotal) < EPSILON
                ? FieldControlStatus.CONFORME
                : FieldControlStatus.ECART);
    }

    private static String lineKey(String commercial, Integer year, Integer month) {
        String normalized = commercial != null ? commercial.trim().toLowerCase(Locale.ROOT) : "";
        return normalized + "|" + year + "-" + month;
    }

    private void notifyEcart(TontineMemberFieldControl saved, TontineMember member) {
        if (saved.getStatus() != FieldControlStatus.ECART || appNotificationService == null) {
            return;
        }
        String clientName = member.getClient() != null ? member.getClient().getFullName() : null;
        Map<String, Double> byCommercial = new LinkedHashMap<>();
        for (TontineMemberFieldControlLine line : saved.getLines()) {
            if (!StringUtils.hasText(line.getCommercialUsername())) {
                continue;
            }
            if (Math.abs(line.getDifferenceAmount() != null ? line.getDifferenceAmount() : 0d) <= 0.5d) {
                continue;
            }
            double positive = Math.max(0d, line.getDifferenceAmount() != null ? line.getDifferenceAmount() : 0d);
            byCommercial.merge(line.getCommercialUsername().trim(), positive, Double::sum);
        }
        for (Map.Entry<String, Double> entry : byCommercial.entrySet()) {
            try {
                appNotificationService.notifyCarnetEcart(
                        entry.getKey(),
                        clientName,
                        saved.getId(),
                        "TONTINE:" + entry.getKey(),
                        entry.getValue());
            } catch (RuntimeException ex) {
                log.warn("Notification d'écart de carnet non envoyée pour le membre {} : {}",
                        member.getId(), ex.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public TontineMemberFieldControlDto getLatest(Long memberId) {
        TontineMemberFieldControl latest = repository
                .findFirstByTontineMember_idAndStateOrderByObservedAtDesc(memberId, State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("tontine.member.field.control.not.found"));
        return toDto(latest, memberId);
    }

    @Transactional(readOnly = true)
    public List<TontineMemberFieldControlDto> getHistory(Long memberId) {
        return repository.findByTontineMember_idAndStateOrderByObservedAtDesc(memberId, State.ENABLED).stream()
                .map(entity -> toDto(entity, memberId))
                .toList();
    }

    private double sumCollectionsForMonth(
            List<TontineCollection> collections,
            int year,
            int month,
            String commercialUsername) {
        return collections.stream()
                .filter(c -> c.getCollectionDate() != null
                        && c.getCollectionDate().getYear() == year
                        && c.getCollectionDate().getMonthValue() == month
                        && commercialUsername != null
                        && commercialUsername.equalsIgnoreCase(
                                c.getCommercialUsername() != null ? c.getCommercialUsername() : ""))
                .mapToDouble(c -> c.getAmount() != null ? c.getAmount() : 0d)
                .sum();
    }

    private TontineMemberFieldControlDto toDto(TontineMemberFieldControl entity, Long memberId) {
        List<TontineMemberFieldControlLineDto> lines = entity.getLines() == null
                ? List.of()
                : entity.getLines().stream()
                .map(line -> TontineMemberFieldControlLineDto.builder()
                        .id(line.getId())
                        .year(line.getYear())
                        .month(line.getMonth())
                        .commercialUsername(line.getCommercialUsername())
                        .notebookAmount(line.getNotebookAmount())
                        .systemAmount(line.getSystemAmount())
                        .differenceAmount(line.getDifferenceAmount())
                        .build())
                .toList();

        List<TontineMemberFieldControlCollectorDto> collectors = buildCollectorSummaries(lines);
        List<String> uncontrolled = resolveUncontrolledCollectors(memberId, collectors);
        EcartDecisionView view = decisionView(entity);
        TontineMember member = entity.getTontineMember();

        return TontineMemberFieldControlDto.builder()
                .id(entity.getId())
                .tontineMemberId(entity.getTontineMember() != null ? entity.getTontineMember().getId() : null)
                .reference(entity.getReference())
                .notebookTotalAmount(entity.getNotebookTotalAmount())
                .systemTotalAmount(entity.getSystemTotalAmount())
                .differenceAmount(entity.getDifferenceAmount())
                .status(entity.getStatus())
                .observedAt(entity.getObservedAt())
                .observedBy(entity.getObservedBy())
                .note(entity.getNote())
                .lines(lines)
                .collectors(collectors)
                .uncontrolledCollectors(uncontrolled)
                .ecartDecisionStatus(view.status())
                .modifiable(view.modifiable())
                .carnetVerified(member != null && Boolean.TRUE.equals(member.getCarnetVerified()))
                .carnetVerifiedAt(member != null ? member.getCarnetVerifiedAt() : null)
                .carnetVerifiedBy(member != null ? member.getCarnetVerifiedBy() : null)
                .build();
    }

    private EcartDecisionView decisionView(TontineMemberFieldControl entity) {
        if (recontrolPolicy == null || entity == null || entity.getId() == null) {
            return EcartDecisionView.none();
        }
        EcartDecisionView view = recontrolPolicy.viewTontine(entity);
        return view != null ? view : EcartDecisionView.none();
    }

    private List<TontineMemberFieldControlCollectorDto> buildCollectorSummaries(
            List<TontineMemberFieldControlLineDto> lines) {
        Map<String, Accumulator> byCommercial = new LinkedHashMap<>();
        for (TontineMemberFieldControlLineDto line : lines) {
            String key = StringUtils.hasText(line.getCommercialUsername())
                    ? line.getCommercialUsername()
                    : "";
            Accumulator acc = byCommercial.computeIfAbsent(key, ignored -> new Accumulator());
            acc.notebook += line.getNotebookAmount() != null ? line.getNotebookAmount() : 0d;
            acc.system += line.getSystemAmount() != null ? line.getSystemAmount() : 0d;
        }

        List<TontineMemberFieldControlCollectorDto> result = new ArrayList<>();
        for (Map.Entry<String, Accumulator> entry : byCommercial.entrySet()) {
            if (!StringUtils.hasText(entry.getKey())) {
                // Contrôles historiques : pas de découpage commercial exposé dans le récap.
                continue;
            }
            Accumulator acc = entry.getValue();
            double difference = acc.notebook - acc.system;
            result.add(TontineMemberFieldControlCollectorDto.builder()
                    .commercialUsername(entry.getKey())
                    .notebookTotalAmount(acc.notebook)
                    .systemTotalAmount(acc.system)
                    .differenceAmount(difference)
                    .status(Math.abs(difference) < EPSILON ? FieldControlStatus.CONFORME : FieldControlStatus.ECART)
                    .build());
        }
        result.sort(Comparator.comparing(
                TontineMemberFieldControlCollectorDto::getCommercialUsername,
                String.CASE_INSENSITIVE_ORDER));
        return result;
    }

    private List<String> resolveUncontrolledCollectors(
            Long memberId,
            List<TontineMemberFieldControlCollectorDto> controlled) {
        if (memberId == null) {
            return List.of();
        }
        Set<String> controlledKeys = controlled.stream()
                .map(TontineMemberFieldControlCollectorDto::getCommercialUsername)
                .filter(StringUtils::hasText)
                .map(u -> u.toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(HashSet::new));

        Set<String> known = new LinkedHashSet<>();
        List<TontineCollection> collections = tontineCollectionRepository
                .findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(memberId, State.ENABLED);
        for (TontineCollection collection : collections) {
            if (StringUtils.hasText(collection.getCommercialUsername())) {
                known.add(collection.getCommercialUsername().trim());
            }
        }

        tontineMemberRepository.findById(memberId).ifPresent(member -> {
            Client client = member.getClient();
            if (client != null && StringUtils.hasText(client.getTontineCollector())) {
                known.add(client.getTontineCollector().trim());
            }
        });

        List<String> uncontrolled = new ArrayList<>();
        for (String commercial : known) {
            if (!controlledKeys.contains(commercial.toLowerCase(Locale.ROOT))) {
                uncontrolled.add(commercial);
            }
        }
        uncontrolled.sort(String.CASE_INSENSITIVE_ORDER);
        return uncontrolled;
    }

    private static String normalizeCommercial(String value) {
        return value != null ? value.trim() : null;
    }

    private static final class Accumulator {
        private double notebook;
        private double system;
    }
}
