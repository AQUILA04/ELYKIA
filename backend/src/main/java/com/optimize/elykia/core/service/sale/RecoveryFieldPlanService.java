package com.optimize.elykia.core.service.sale;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.CreditFieldControlDto;
import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.TontineMemberFieldControlDto;
import com.optimize.elykia.core.dto.TontineMemberFieldControlLineDto;
import com.optimize.elykia.core.dto.TontineMemberFieldControlCollectorDto;
import com.optimize.elykia.core.dto.TontineMemberMonthlyAggregateDto;
import com.optimize.elykia.core.dto.TontineMemberMonthlyByCommercialAggregateDto;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.dto.sale.*;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.entity.sale.RecoveryFieldDayPlan;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import com.optimize.elykia.core.enumaration.FieldDayPlanStatus;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.RecoveryFieldDayPlanRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.CreditLateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class RecoveryFieldPlanService {

    private static final int MAX_COMMERCIALS = 5;
    private static final long BYTES_PER_LATE_CREDIT_ESTIMATE = 8_000L;
    private static final long BYTES_PER_TONTINE_MEMBER_ESTIMATE = 3_000L;
    private static final List<Integer> TONTINE_CALENDAR_MONTHS =
            List.of(2, 3, 4, 5, 6, 7, 8, 9, 10, 11);

    private final RecoveryFieldDayPlanRepository planRepository;
    private final CreditLateService creditLateService;
    private final CreditRepository creditRepository;
    private final CreditFieldControlRepository creditFieldControlRepository;
    private final TontineMemberRepository tontineMemberRepository;
    private final TontineCollectionRepository tontineCollectionRepository;
    private final TontineMemberFieldControlRepository tontineMemberFieldControlRepository;
    private final ClientService clientService;
    private final ObjectMapper objectMapper;

    public FieldDayPlanDto createOrReplacePlan(FieldDayPlanRequestDto request, String recoveryManagerUsername) {
        validateRequest(request);

        LocalDate planDate = request.getPlanDate();
        planRepository.findByRecoveryManagerUsernameAndPlanDateAndStatus(
                recoveryManagerUsername, planDate, FieldDayPlanStatus.ACTIVE
        ).ifPresent(existing -> {
            existing.setStatus(FieldDayPlanStatus.CLOSED);
            planRepository.save(existing);
            planRepository.flush();
        });

        RecoveryFieldDayPlan plan = new RecoveryFieldDayPlan();
        plan.setRecoveryManagerUsername(recoveryManagerUsername);
        plan.setPlanDate(planDate);
        plan.setStatus(FieldDayPlanStatus.ACTIVE);
        plan.setCommercialUsernamesJson(toJson(normalizeUsernames(request.getCommercialUsernames())));
        plan.setQuartersJson(toJson(normalizeQuarters(request.getQuarters())));

        return toDto(planRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public Optional<FieldDayPlanDto> getTodayPlan(String recoveryManagerUsername) {
        return planRepository.findByRecoveryManagerUsernameAndPlanDateAndStatus(
                recoveryManagerUsername, LocalDate.now(), FieldDayPlanStatus.ACTIVE
        ).map(this::toDto);
    }

    public FieldDayPlanDto updatePlan(Long planId, FieldDayPlanRequestDto request, String recoveryManagerUsername) {
        validateRequest(request);
        RecoveryFieldDayPlan plan = planRepository.findByIdAndRecoveryManagerUsername(planId, recoveryManagerUsername)
                .orElseThrow(() -> new ApplicationException("Plan terrain introuvable"));
        if (plan.getStatus() != FieldDayPlanStatus.ACTIVE) {
            throw new ApplicationException("Seul un plan ACTIVE peut être modifié");
        }
        if (!plan.getPlanDate().equals(LocalDate.now())) {
            throw new ApplicationException("Modification autorisée uniquement pour le plan du jour");
        }

        plan.setCommercialUsernamesJson(toJson(normalizeUsernames(request.getCommercialUsernames())));
        plan.setQuartersJson(toJson(normalizeQuarters(request.getQuarters())));
        return toDto(planRepository.save(plan));
    }

    public FieldDayPlanDto closePlan(Long planId, String recoveryManagerUsername) {
        RecoveryFieldDayPlan plan = planRepository.findByIdAndRecoveryManagerUsername(planId, recoveryManagerUsername)
                .orElseThrow(() -> new ApplicationException("Plan terrain introuvable"));
        plan.setStatus(FieldDayPlanStatus.CLOSED);
        return toDto(planRepository.save(plan));
    }

    public RmPackClientDto updateClientContact(Long clientId, RmClientContactUpdateDto dto, String recoveryManagerUsername) {
        FieldDayPlanDto plan = getTodayPlan(recoveryManagerUsername)
                .orElseThrow(() -> new ApplicationException("Aucun plan terrain ACTIVE pour aujourd'hui"));

        Client client = clientService.getById(clientId);
        assertClientInActivePlan(client, plan);

        boolean hasPhone = StringUtils.hasText(dto.getPhone());
        boolean hasGeo = dto.getLatitude() != null || dto.getLongitude() != null || StringUtils.hasText(dto.getMll());
        if (!hasPhone && !hasGeo) {
            throw new ApplicationException("Fournissez au moins le téléphone ou la géolocalisation");
        }
        if ((dto.getLatitude() == null) != (dto.getLongitude() == null)) {
            throw new ApplicationException("Latitude et longitude doivent être fournies ensemble");
        }

        clientService.updatePhoneAndGeo(
                clientId,
                dto.getPhone(),
                dto.getLatitude(),
                dto.getLongitude(),
                dto.getMll()
        );
        Client updated = clientService.getById(clientId);
        return RmPackClientDto.builder()
                .id(updated.getId())
                .firstname(updated.getFirstname())
                .lastname(updated.getLastname())
                .fullName(updated.getFullName())
                .phone(updated.getPhone())
                .quarter(updated.getQuarter())
                .collector(updated.getCollector())
                .tontineCollector(updated.getTontineCollector())
                .latitude(updated.getLatitude())
                .longitude(updated.getLongitude())
                .mll(updated.getMll())
                .build();
    }

    private void assertClientInActivePlan(Client client, FieldDayPlanDto plan) {
        List<String> commercials = plan.getCommercialUsernames() != null ? plan.getCommercialUsernames() : List.of();
        String collector = client.getCollector();
        boolean collectorOk = StringUtils.hasText(collector)
                && commercials.stream().anyMatch(c -> c.equalsIgnoreCase(collector.trim()));
        if (!collectorOk) {
            throw new ApplicationException("Client hors périmètre du plan (commercial)");
        }

        List<String> quarters = plan.getQuarters() != null ? plan.getQuarters() : List.of();
        if (!quarters.isEmpty()) {
            String clientQuarter = client.getQuarter();
            boolean quarterOk = StringUtils.hasText(clientQuarter)
                    && quarters.stream().anyMatch(q -> q.equalsIgnoreCase(clientQuarter.trim()));
            if (!quarterOk) {
                throw new ApplicationException("Client hors périmètre du plan (quartier)");
            }
        }
    }

    @Transactional(readOnly = true)
    public List<RmCollectorStatDto> getCollectorStats() {
        int sessionYear = LocalDate.now().getYear();
        Set<String> usernameSet = new LinkedHashSet<>();
        creditRepository.findDistinctCollectors().stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .forEach(usernameSet::add);
        tontineMemberRepository.findDistinctTontineCollectorsBySessionYear(sessionYear, State.ENABLED).stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .forEach(usernameSet::add);

        Map<String, Long> tontineMemberCounts = loadInProgressTontineCounts(sessionYear, usernameSet);

        List<RmCollectorStatDto> stats = new ArrayList<>();
        for (String username : usernameSet) {
            List<CreditLateDTO> lates = creditLateService.getLateCredits(username, null, null);
            List<String> quarters = lates.stream()
                    .map(CreditLateDTO::getClientQuarter)
                    .filter(StringUtils::hasText)
                    .map(String::trim)
                    .distinct()
                    .sorted(String.CASE_INSENSITIVE_ORDER)
                    .collect(Collectors.toCollection(ArrayList::new));
            if (quarters.isEmpty()) {
                quarters.addAll(loadPortfolioQuarters(username, sessionYear));
                quarters = quarters.stream()
                        .distinct()
                        .sorted(String.CASE_INSENSITIVE_ORDER)
                        .collect(Collectors.toList());
            }
            double total = lates.stream()
                    .mapToDouble(d -> d.getTotalAmountRemaining() != null ? d.getTotalAmountRemaining() : 0.0)
                    .sum();
            stats.add(RmCollectorStatDto.builder()
                    .username(username)
                    .lateCount(lates.size())
                    .totalAmountRemaining(total)
                    .tontineMemberCount(tontineMemberCounts.getOrDefault(username, 0L))
                    .quarters(quarters)
                    .build());
        }
        stats.sort(Comparator.comparingLong(RmCollectorStatDto::getLateCount).reversed()
                .thenComparing(Comparator.comparingLong(RmCollectorStatDto::getTontineMemberCount).reversed())
                .thenComparing(RmCollectorStatDto::getUsername, String.CASE_INSENSITIVE_ORDER));
        return stats;
    }

    /**
     * Commerciaux qui suivent une tontine en cours, même sans retard crédit ni retard de cotisation.
     */
    private Map<String, Long> loadInProgressTontineCounts(int sessionYear, Set<String> usernameSet) {
        Map<String, Long> counts = new HashMap<>();
        List<Object[]> rows = tontineMemberRepository.countInProgressByTontineCollector(
                sessionYear, State.ENABLED, TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        if (rows == null) {
            return counts;
        }
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null) {
                continue;
            }
            String username = canonicalUsername(usernameSet, row[0].toString().trim());
            if (!StringUtils.hasText(username)) {
                continue;
            }
            long count = row[1] instanceof Number number ? number.longValue() : 0L;
            if (count <= 0) {
                continue;
            }
            counts.merge(username, count, Long::sum);
            usernameSet.add(username);
        }
        return counts;
    }

    private String canonicalUsername(Set<String> usernameSet, String raw) {
        if (!StringUtils.hasText(raw)) {
            return raw;
        }
        for (String existing : usernameSet) {
            if (existing.equalsIgnoreCase(raw)) {
                return existing;
            }
        }
        return raw;
    }

    private List<String> loadPortfolioQuarters(String username, int sessionYear) {
        Set<String> quarters = new LinkedHashSet<>();
        creditRepository.findDistinctClientQuartersByCollector(username).stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .forEach(quarters::add);
        tontineMemberRepository.findDistinctQuartersBySessionYearAndTontineCollector(
                sessionYear, username, State.ENABLED).stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .forEach(quarters::add);
        return new ArrayList<>(quarters);
    }

    @Transactional(readOnly = true)
    public RmOfflinePackDto buildOfflinePack(Long planId, String recoveryManagerUsername, boolean includeTontine) {
        RecoveryFieldDayPlan plan = planRepository.findByIdAndRecoveryManagerUsername(planId, recoveryManagerUsername)
                .orElseThrow(() -> new ApplicationException("Plan terrain introuvable"));
        if (plan.getStatus() != FieldDayPlanStatus.ACTIVE) {
            throw new ApplicationException("Le pack offline n'est disponible que pour un plan ACTIVE");
        }

        List<String> commercials = fromJson(plan.getCommercialUsernamesJson());
        List<String> quarters = fromJson(plan.getQuartersJson());
        Set<String> quarterFilter = quarters.stream()
                .filter(StringUtils::hasText)
                .map(q -> q.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        List<CreditLateDTO> lateCredits = new ArrayList<>();
        for (String commercial : commercials) {
            List<CreditLateDTO> forCommercial = creditLateService.getLateCredits(commercial, null, null);
            if (quarterFilter.isEmpty()) {
                lateCredits.addAll(forCommercial);
            } else {
                forCommercial.stream()
                        .filter(dto -> dto.getClientQuarter() != null
                                && quarterFilter.contains(dto.getClientQuarter().trim().toLowerCase(Locale.ROOT)))
                        .forEach(lateCredits::add);
            }
        }

        Map<Long, RmPackClientDto> clientsById = new LinkedHashMap<>();
        for (CreditLateDTO late : lateCredits) {
            if (late.getClientId() == null || clientsById.containsKey(late.getClientId())) {
                continue;
            }
            clientsById.put(late.getClientId(), loadClientDto(late));
        }

        List<Long> creditIds = lateCredits.stream().map(CreditLateDTO::getId).filter(Objects::nonNull).toList();
        List<CreditFieldControlDto> controlsToday = loadFieldControlsToday(creditIds);

        List<RmPackTontineMemberDto> tontineMembers = includeTontine
                ? loadTontineMembers(commercials, quarterFilter, clientsById)
                : List.of();
        List<Long> tontineMemberIds = tontineMembers.stream()
                .map(RmPackTontineMemberDto::getId)
                .filter(Objects::nonNull)
                .toList();
        List<TontineMemberFieldControlDto> tontineControlsToday = includeTontine
                ? loadTontineFieldControlsToday(tontineMemberIds)
                : List.of();

        List<RmCommercialRefDto> commercialRefs = commercials.stream()
                .map(u -> RmCommercialRefDto.builder().username(u).displayName(u).build())
                .toList();

        long estimatedBytes = lateCredits.size() * BYTES_PER_LATE_CREDIT_ESTIMATE
                + clientsById.size() * 2_000L
                + tontineMembers.size() * BYTES_PER_TONTINE_MEMBER_ESTIMATE;

        return RmOfflinePackDto.builder()
                .planId(plan.getId())
                .planDate(plan.getPlanDate())
                .generatedAt(Instant.now())
                .stats(RmOfflinePackStatsDto.builder()
                        .lateCredits(lateCredits.size())
                        .clients(clientsById.size())
                        .tontineMembers(tontineMembers.size())
                        .estimatedBytes(estimatedBytes)
                        .build())
                .commercials(commercialRefs)
                .lateCredits(lateCredits)
                .clients(new ArrayList<>(clientsById.values()))
                .creditFieldControlsToday(controlsToday)
                .tontineMembers(tontineMembers)
                .tontineFieldControlsToday(tontineControlsToday)
                .build();
    }

    public Page<RmFieldTontineRowDto> pageTontineMembers(String search, int page, int size) {
        String folded = foldSearch(search);
        String digits = folded.replaceAll("\\D", "");
        return tontineMemberRepository.pageFieldRows(
                LocalDate.now().getYear(),
                State.ENABLED,
                folded.isEmpty() ? null : folded,
                digits.isEmpty() ? null : digits,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 40)));
    }

    public RmPackTontineMemberDto getTontineMemberForField(Long id) {
        TontineMember member = tontineMemberRepository.findById(id)
                .orElseThrow(() -> new ApplicationException("Membre tontine introuvable"));
        Client client = member.getClient();
        if (client == null) {
            throw new ApplicationException("Membre tontine sans client");
        }
        int sessionYear = member.getTontineSession() != null && member.getTontineSession().getYear() != null
                ? member.getTontineSession().getYear()
                : LocalDate.now().getYear();
        Map<String, Double> monthAmounts = new HashMap<>();
        for (TontineMemberMonthlyAggregateDto agg : tontineCollectionRepository.sumMonthlyByMemberId(id, State.ENABLED)) {
            monthAmounts.put(agg.getYear() + "-" + agg.getMonth(), agg.getTotalAmount());
        }
        List<RmPackTontineMonthDto> months = buildSessionMonths(sessionYear, monthAmounts);
        Map<String, LocalDateTime> firstCollectionDates = loadFirstCollectionDates(List.of(id));
        List<RmPackTontineCollectorDto> collectors = buildCollectorsForMember(
                id,
                sessionYear,
                client.getTontineCollector(),
                tontineCollectionRepository.sumMonthlyByMemberIdAndCommercial(id, State.ENABLED),
                firstCollectionDates);
        String firstname = client.getFirstname() != null ? client.getFirstname() : "";
        String lastname = client.getLastname() != null ? client.getLastname() : "";
        String fullName = (firstname + " " + lastname).trim();
        if (!StringUtils.hasText(fullName)) {
            fullName = "Client #" + client.getId();
        }
        return RmPackTontineMemberDto.builder()
                .id(member.getId())
                .clientId(client.getId())
                .clientName(fullName)
                .clientPhone(client.getPhone())
                .clientQuarter(client.getQuarter())
                .tontineCollector(client.getTontineCollector())
                .sessionYear(sessionYear)
                .amount(member.getAmount())
                .totalContribution(member.getTotalContribution())
                .deliveryStatus(member.getDeliveryStatus() != null ? member.getDeliveryStatus().name() : null)
                .carnetVerified(Boolean.TRUE.equals(member.getCarnetVerified()))
                .carnetVerifiedAt(member.getCarnetVerifiedAt())
                .carnetVerifiedBy(member.getCarnetVerifiedBy())
                .months(months)
                .collectors(collectors)
                .build();
    }

    private static String foldSearch(String search) {
        if (search == null) {
            return "";
        }
        return Normalizer.normalize(search, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private List<RmPackTontineMemberDto> loadTontineMembers(
            List<String> commercials,
            Set<String> quarterFilter,
            Map<Long, RmPackClientDto> clientsById) {
        if (commercials == null || commercials.isEmpty()) {
            return List.of();
        }
        int sessionYear = LocalDate.now().getYear();
        List<TontineMember> members = tontineMemberRepository.findActiveBySessionYearAndTontineCollectors(
                sessionYear, commercials, State.ENABLED);
        if (members.isEmpty()) {
            return List.of();
        }

        Map<Long, Map<String, Double>> amountsByMemberMonth = new HashMap<>();
        List<TontineMemberMonthlyAggregateDto> aggregates = tontineCollectionRepository
                .sumMonthlyBySessionYearAndTontineCollectors(sessionYear, commercials, State.ENABLED);
        for (TontineMemberMonthlyAggregateDto agg : aggregates) {
            if (agg.getMemberId() == null) {
                continue;
            }
            String key = agg.getYear() + "-" + agg.getMonth();
            amountsByMemberMonth
                    .computeIfAbsent(agg.getMemberId(), id -> new HashMap<>())
                    .put(key, agg.getTotalAmount());
        }

        Map<Long, List<TontineMemberMonthlyByCommercialAggregateDto>> byCommercialAggs = new HashMap<>();
        for (TontineMemberMonthlyByCommercialAggregateDto agg : tontineCollectionRepository
                .sumMonthlyBySessionYearAndCommercialForCollectors(sessionYear, commercials, State.ENABLED)) {
            if (agg.getMemberId() == null) {
                continue;
            }
            byCommercialAggs.computeIfAbsent(agg.getMemberId(), id -> new ArrayList<>()).add(agg);
        }
        List<Long> memberIds = members.stream()
                .map(TontineMember::getId)
                .filter(Objects::nonNull)
                .toList();
        Map<String, LocalDateTime> firstCollectionDates = loadFirstCollectionDates(memberIds);

        List<RmPackTontineMemberDto> result = new ArrayList<>();
        for (TontineMember member : members) {
            Client client = member.getClient();
            if (client == null) {
                continue;
            }
            String quarter = client.getQuarter();
            if (!quarterFilter.isEmpty()) {
                if (!StringUtils.hasText(quarter)
                        || !quarterFilter.contains(quarter.trim().toLowerCase(Locale.ROOT))) {
                    continue;
                }
            }

            if (client.getId() != null && !clientsById.containsKey(client.getId())) {
                clientsById.put(client.getId(), toPackClientFromEntity(client, client.getTontineCollector()));
            }

            String firstname = client.getFirstname() != null ? client.getFirstname() : "";
            String lastname = client.getLastname() != null ? client.getLastname() : "";
            String fullName = (firstname + " " + lastname).trim();
            if (!StringUtils.hasText(fullName)) {
                fullName = "Client #" + client.getId();
            }

            Map<String, Double> monthAmounts = amountsByMemberMonth.getOrDefault(member.getId(), Map.of());
            List<RmPackTontineMonthDto> months = buildSessionMonths(sessionYear, monthAmounts);
            List<RmPackTontineCollectorDto> collectors = buildCollectorsForMember(
                    member.getId(),
                    sessionYear,
                    client.getTontineCollector(),
                    byCommercialAggs.getOrDefault(member.getId(), List.of()),
                    firstCollectionDates);

            result.add(RmPackTontineMemberDto.builder()
                    .id(member.getId())
                    .clientId(client.getId())
                    .clientName(fullName)
                    .clientPhone(client.getPhone())
                    .clientQuarter(quarter)
                    .tontineCollector(client.getTontineCollector())
                    .sessionYear(member.getTontineSession() != null ? member.getTontineSession().getYear() : sessionYear)
                    .amount(member.getAmount())
                    .totalContribution(member.getTotalContribution())
                    .deliveryStatus(member.getDeliveryStatus() != null ? member.getDeliveryStatus().name() : null)
                    .carnetVerified(Boolean.TRUE.equals(member.getCarnetVerified()))
                    .carnetVerifiedAt(member.getCarnetVerifiedAt())
                    .carnetVerifiedBy(member.getCarnetVerifiedBy())
                    .months(months)
                    .collectors(collectors)
                    .build());
        }
        return result;
    }

    private List<RmPackTontineMonthDto> buildSessionMonths(int sessionYear, Map<String, Double> monthAmounts) {
        List<RmPackTontineMonthDto> months = new ArrayList<>();
        for (Integer calendarMonth : TONTINE_CALENDAR_MONTHS) {
            String key = sessionYear + "-" + calendarMonth;
            months.add(RmPackTontineMonthDto.builder()
                    .year(sessionYear)
                    .month(calendarMonth)
                    .systemAmount(monthAmounts.getOrDefault(key, 0d))
                    .build());
        }
        return months;
    }

    /** Clé composite memberId|commercialUsername → première date de collecte. */
    private Map<String, LocalDateTime> loadFirstCollectionDates(List<Long> memberIds) {
        Map<String, LocalDateTime> byKey = new HashMap<>();
        if (memberIds == null || memberIds.isEmpty()) {
            return byKey;
        }
        for (Object[] row : tontineCollectionRepository
                .findFirstCollectionDateByMemberAndCommercial(memberIds, State.ENABLED)) {
            if (row == null || row.length < 3 || row[0] == null || row[1] == null || row[2] == null) {
                continue;
            }
            Long memberId = ((Number) row[0]).longValue();
            String commercial = String.valueOf(row[1]).trim();
            LocalDateTime first = row[2] instanceof LocalDateTime
                    ? (LocalDateTime) row[2]
                    : null;
            if (first == null || !StringUtils.hasText(commercial)) {
                continue;
            }
            byKey.put(memberCommercialKey(memberId, commercial), first);
        }
        return byKey;
    }

    private static String memberCommercialKey(Long memberId, String commercial) {
        return memberId + "|" + commercial.toLowerCase(Locale.ROOT);
    }

    private List<RmPackTontineCollectorDto> buildCollectorsForMember(
            Long memberId,
            int sessionYear,
            String currentCollector,
            List<TontineMemberMonthlyByCommercialAggregateDto> aggregates,
            Map<String, LocalDateTime> firstCollectionDates) {
        Map<String, Map<String, Double>> monthsByCommercial = new LinkedHashMap<>();
        Map<String, Double> totals = new HashMap<>();
        for (TontineMemberMonthlyByCommercialAggregateDto agg : aggregates) {
            if (!StringUtils.hasText(agg.getCommercialUsername())) {
                continue;
            }
            String commercial = agg.getCommercialUsername().trim();
            String monthKey = agg.getYear() + "-" + agg.getMonth();
            monthsByCommercial
                    .computeIfAbsent(commercial, key -> new HashMap<>())
                    .merge(monthKey, agg.getTotalAmount(), Double::sum);
            totals.merge(commercial, agg.getTotalAmount(), Double::sum);
        }
        if (StringUtils.hasText(currentCollector)
                && monthsByCommercial.keySet().stream()
                .noneMatch(c -> c.equalsIgnoreCase(currentCollector.trim()))) {
            monthsByCommercial.put(currentCollector.trim(), new HashMap<>());
            totals.putIfAbsent(currentCollector.trim(), 0d);
        }

        List<String> ordered = new ArrayList<>(monthsByCommercial.keySet());
        ordered.sort((a, b) -> {
            LocalDateTime fa = firstCollectionDates.get(memberCommercialKey(memberId, a));
            LocalDateTime fb = firstCollectionDates.get(memberCommercialKey(memberId, b));
            if (fa == null && fb == null) {
                return a.compareToIgnoreCase(b);
            }
            if (fa == null) {
                return 1;
            }
            if (fb == null) {
                return -1;
            }
            int cmp = fa.compareTo(fb);
            return cmp != 0 ? cmp : a.compareToIgnoreCase(b);
        });

        List<RmPackTontineCollectorDto> result = new ArrayList<>();
        for (String commercial : ordered) {
            Map<String, Double> monthAmounts = monthsByCommercial.getOrDefault(commercial, Map.of());
            result.add(RmPackTontineCollectorDto.builder()
                    .commercialUsername(commercial)
                    .currentCollector(StringUtils.hasText(currentCollector)
                            && commercial.equalsIgnoreCase(currentCollector.trim()))
                    .totalAmount(totals.getOrDefault(commercial, 0d))
                    .months(buildSessionMonths(sessionYear, monthAmounts))
                    .build());
        }
        return result;
    }

    private List<TontineMemberFieldControlDto> loadTontineFieldControlsToday(List<Long> memberIds) {
        if (memberIds == null || memberIds.isEmpty()) {
            return List.of();
        }
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        List<TontineMemberFieldControl> controls = tontineMemberFieldControlRepository
                .findByTontineMember_IdInAndObservedAtBetweenAndState(memberIds, start, end, State.ENABLED);
        return controls.stream().map(this::toTontineFieldControlDto).toList();
    }

    private TontineMemberFieldControlDto toTontineFieldControlDto(TontineMemberFieldControl entity) {
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

        Map<String, double[]> byCommercial = new LinkedHashMap<>();
        for (TontineMemberFieldControlLineDto line : lines) {
            if (!StringUtils.hasText(line.getCommercialUsername())) {
                continue;
            }
            double[] acc = byCommercial.computeIfAbsent(
                    line.getCommercialUsername(), key -> new double[2]);
            acc[0] += line.getNotebookAmount() != null ? line.getNotebookAmount() : 0d;
            acc[1] += line.getSystemAmount() != null ? line.getSystemAmount() : 0d;
        }
        List<TontineMemberFieldControlCollectorDto> collectors = byCommercial.entrySet().stream()
                .map(entry -> {
                    double notebook = entry.getValue()[0];
                    double system = entry.getValue()[1];
                    double difference = notebook - system;
                    return TontineMemberFieldControlCollectorDto.builder()
                            .commercialUsername(entry.getKey())
                            .notebookTotalAmount(notebook)
                            .systemTotalAmount(system)
                            .differenceAmount(difference)
                            .status(Math.abs(difference) < 0.0001d
                                    ? FieldControlStatus.CONFORME
                                    : FieldControlStatus.ECART)
                            .build();
                })
                .toList();

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
                .uncontrolledCollectors(List.of())
                .build();
    }

    private RmPackClientDto loadClientDto(CreditLateDTO late) {
        Double latitude = null;
        Double longitude = null;
        String mll = null;
        String firstname = null;
        String lastname = null;
        String tontineCollector = null;
        String profilPhotoUrl = null;
        String profilPhotoThumbUrl = null;
        try {
            Optional<Credit> credit = creditRepository.findById(late.getId());
            if (credit.isPresent() && credit.get().getClient() != null) {
                Client client = credit.get().getClient();
                firstname = client.getFirstname();
                lastname = client.getLastname();
                tontineCollector = client.getTontineCollector();
                latitude = client.getLatitude();
                longitude = client.getLongitude();
                mll = client.getMll();
                profilPhotoUrl = client.getProfilPhotoUrl();
                profilPhotoThumbUrl = client.getProfilPhotoThumbUrl();
            }
        } catch (Exception e) {
            log.warn("Unable to load geo for client {}: {}", late.getClientId(), e.getMessage());
        }

        String fullName = late.getClientName();
        return RmPackClientDto.builder()
                .id(late.getClientId())
                .firstname(firstname)
                .lastname(lastname)
                .fullName(fullName)
                .phone(late.getClientPhone())
                .quarter(late.getClientQuarter())
                .collector(late.getCollector())
                .tontineCollector(tontineCollector)
                .latitude(latitude)
                .longitude(longitude)
                .mll(mll)
                .profilPhotoUrl(profilPhotoUrl)
                .profilPhotoThumbUrl(profilPhotoThumbUrl)
                .build();
    }

    private RmPackClientDto toPackClientFromEntity(Client client, String fallbackCollector) {
        String firstname = client.getFirstname() != null ? client.getFirstname() : "";
        String lastname = client.getLastname() != null ? client.getLastname() : "";
        String fullName = (firstname + " " + lastname).trim();
        if (!StringUtils.hasText(fullName)) {
            fullName = "Client #" + client.getId();
        }
        return RmPackClientDto.builder()
                .id(client.getId())
                .firstname(client.getFirstname())
                .lastname(client.getLastname())
                .fullName(fullName)
                .phone(client.getPhone())
                .quarter(client.getQuarter())
                .collector(StringUtils.hasText(client.getCollector()) ? client.getCollector() : fallbackCollector)
                .tontineCollector(client.getTontineCollector())
                .latitude(client.getLatitude())
                .longitude(client.getLongitude())
                .mll(client.getMll())
                .profilPhotoUrl(client.getProfilPhotoUrl())
                .profilPhotoThumbUrl(client.getProfilPhotoThumbUrl())
                .build();
    }

    private List<CreditFieldControlDto> loadFieldControlsToday(List<Long> creditIds) {
        if (creditIds.isEmpty()) {
            return List.of();
        }
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        List<CreditFieldControl> controls = creditFieldControlRepository
                .findByCredit_IdInAndObservedAtBetweenAndState(creditIds, start, end, State.ENABLED);
        return controls.stream().map(this::toFieldControlDto).toList();
    }

    private CreditFieldControlDto toFieldControlDto(CreditFieldControl entity) {
        return CreditFieldControlDto.builder()
                .id(entity.getId())
                .creditId(entity.getCredit() != null ? entity.getCredit().getId() : null)
                .reference(entity.getReference())
                .notebookTotalAmount(entity.getNotebookTotalAmount())
                .systemTotalAmountPaid(entity.getSystemTotalAmountPaid())
                .differenceAmount(entity.getDifferenceAmount())
                .status(entity.getStatus())
                .observedAt(entity.getObservedAt())
                .observedBy(entity.getObservedBy())
                .note(entity.getNote())
                .build();
    }

    private void validateRequest(FieldDayPlanRequestDto request) {
        if (request.getCommercialUsernames() == null || request.getCommercialUsernames().isEmpty()) {
            throw new ApplicationException("Au moins un commercial est requis");
        }
        List<String> normalized = normalizeUsernames(request.getCommercialUsernames());
        if (normalized.size() > MAX_COMMERCIALS) {
            throw new ApplicationException("Maximum " + MAX_COMMERCIALS + " commerciaux par plan");
        }
        if (normalized.isEmpty()) {
            throw new ApplicationException("Au moins un commercial est requis");
        }
    }

    private List<String> normalizeUsernames(List<String> usernames) {
        if (usernames == null) {
            return List.of();
        }
        return usernames.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private List<String> normalizeQuarters(List<String> quarters) {
        if (quarters == null) {
            return List.of();
        }
        return quarters.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private FieldDayPlanDto toDto(RecoveryFieldDayPlan plan) {
        return FieldDayPlanDto.builder()
                .id(plan.getId())
                .recoveryManagerUsername(plan.getRecoveryManagerUsername())
                .planDate(plan.getPlanDate())
                .status(plan.getStatus())
                .commercialUsernames(fromJson(plan.getCommercialUsernamesJson()))
                .quarters(fromJson(plan.getQuartersJson()))
                .build();
    }

    private String toJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values != null ? values : List.of());
        } catch (JsonProcessingException e) {
            throw new ApplicationException("Erreur sérialisation plan terrain");
        }
    }

    private List<String> fromJson(String json) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Invalid plan JSON: {}", e.getMessage());
            return List.of();
        }
    }
}
