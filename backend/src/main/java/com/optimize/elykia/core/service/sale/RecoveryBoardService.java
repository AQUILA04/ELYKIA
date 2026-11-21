package com.optimize.elykia.core.service.sale;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.carnet.CarnetEcartItemDto;
import com.optimize.elykia.core.dto.sale.RecoveryBoardDto;
import com.optimize.elykia.core.dto.sale.RecoveryManagerActivityDto;
import com.optimize.elykia.core.dto.sale.RecoveryManagerReportSummaryDto;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.entity.sale.RecoveryFieldDayPlan;
import com.optimize.elykia.core.enumaration.LateType;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.RecoveryFieldDayPlanRepository;
import com.optimize.elykia.core.repository.RecoveryManagerOperationRepository;
import com.optimize.elykia.core.service.CreditLateService;
import com.optimize.elykia.core.service.carnet.CarnetEcartDecisionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;

/**
 * Board de pilotage du recouvrement terrain : KPI, tendance, retards prioritaires, points
 * d'attention et, pour le gestionnaire, les chefs côte à côte.
 *
 * <p>Le portefeuille des retards est commun à tous les chefs (les retards ne sont pas affectés).
 * Le taux du mois garde la règle du taux mensuel : recouvré du mois / dû live des retards délai.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecoveryBoardService {

    public static final String RECOVERY_MANAGER_PROFILE = "RECOVERY_MANAGER";
    /** Taux du mois visé par chef, en %. Vide : pas d'objectif. */
    public static final String RATE_TARGET_PARAMETER = "RECOVERY_MONTHLY_RATE_TARGET";
    /** Part du portefeuille en cours (crédit + tontine) contrôlée dans le mois, par chef, en %. */
    public static final String COVERAGE_TARGET_PARAMETER = "RECOVERY_COVERAGE_TARGET";

    static final int TREND_DAYS = 30;
    static final int PRIORITY_LIMIT = 10;
    static final int STALE_CONTROL_DAYS = 30;
    static final int INACTIVE_DAYS = 5;

    static final String HIGH = "HIGH";
    static final String MEDIUM = "MEDIUM";

    private final RecoveryReportAccess access;
    private final RecoveryManagerOperationRepository operationRepository;
    private final RecoveryManagerService recoveryManagerService;
    private final RecoveryManagerActivityService activityService;
    private final CreditLateService creditLateService;
    private final CreditFieldControlRepository creditFieldControlRepository;
    private final CarnetEcartDecisionService ecartService;
    private final RecoveryFieldDayPlanRepository planRepository;
    private final UserRepository userRepository;
    private final ParameterService parameterService;
    private final ObjectMapper objectMapper;

    public RecoveryBoardDto getBoard(LocalDate startDate, LocalDate endDate,
                                     String requestedManager, String commercialUsername) {
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("La date de fin précède la date de début");
        }
        String commercial = StringUtils.hasText(commercialUsername) ? commercialUsername.trim() : null;
        String manager = resolveManager(requestedManager);
        boolean team = manager == null;

        LocalDate today = LocalDate.now();
        LocalDate effectiveEnd = endDate.isAfter(today) ? today : endDate;
        if (effectiveEnd.isBefore(startDate)) {
            effectiveEnd = endDate;
        }
        YearMonth month = YearMonth.from(endDate);
        LocalDate monthStart = month.atDay(1);

        RecoveryManagerReportSummaryDto summary = recoveryManagerService.getReportSummary(
                startDate, endDate, manager, commercial);

        List<CreditLateDTO> lates = creditLateService.getLateCredits(null, null, null);
        List<CreditLateDTO> delai = lates.stream().filter(late -> late.getLateType() == LateType.DELAI).toList();
        double latePortfolioDue = delai.stream().mapToDouble(late -> safe(late.getTotalAmountRemaining())).sum();

        double monthCollected = sum(operationRepository.sumAmountCollected(
                monthStart, month.atEndOfMonth(), manager, commercial));
        RecoveryBoardDto.MonthRate monthRate = RecoveryBoardDto.MonthRate.builder()
                .year(month.getYear())
                .month(month.getMonthValue())
                .collectedAmount(monthCollected)
                .latePortfolioDue(latePortfolioDue)
                .lateCreditsCount(delai.size())
                .ratePercent(rate(monthCollected, latePortfolioDue))
                .build();

        MonthWindow window = MonthWindow.of(effectiveEnd);
        RecoveryBoardDto.MonthComparison comparison = comparison(window, manager, commercial);

        RecoveryManagerActivityDto monthActivity = activityService.getActivity(
                monthStart, effectiveEnd.isBefore(monthStart) ? monthStart : effectiveEnd, manager, commercial);
        RecoveryBoardDto.Coverage coverage = coverage(monthActivity);

        RecoveryBoardDto.Targets targets = RecoveryBoardDto.Targets.builder()
                .monthlyRatePercent(readTarget(RATE_TARGET_PARAMETER))
                .coveragePercent(readTarget(COVERAGE_TARGET_PARAMETER))
                .elapsedRatio(elapsedRatio(month, today))
                .build();

        List<RecoveryBoardDto.PriorityLate> priority = priorityLate(delai, commercial);
        List<RecoveryBoardDto.ManagerRow> rows = team
                ? teamRows(startDate, endDate, monthStart, effectiveEnd, window, latePortfolioDue, commercial, today)
                : null;

        List<RecoveryBoardDto.Attention> attention = new ArrayList<>();
        attention.addAll(pendingEcarts(manager, commercial));
        attention.addAll(controlAttention(priority, effectiveEnd));
        if (team) {
            for (RecoveryBoardDto.ManagerRow row : rows) {
                attention.addAll(targetAttention(row.getUsername(), row.getMonthRatePercent(),
                        combinedCoverage(row), targets));
                inactive(row, effectiveEnd).ifPresent(attention::add);
            }
        } else {
            attention.addAll(targetAttention(manager, monthRate.getRatePercent(),
                    combinedCoverage(coverage), targets));
        }
        attention.sort(Comparator.comparing((RecoveryBoardDto.Attention a) -> HIGH.equals(a.getSeverity()) ? 0 : 1)
                .thenComparing(a -> -a.getAmount()));

        return RecoveryBoardDto.builder()
                .scope(team ? RecoveryBoardDto.SCOPE_TEAM : RecoveryBoardDto.SCOPE_MANAGER)
                .recoveryManagerUsername(manager)
                .startDate(startDate)
                .endDate(endDate)
                .collectedAmount(summary.getTotalAmountCollected())
                .operationsCount(summary.getTotalOperationsCount())
                .commercialsCount(summary.getCommercialsCount())
                .remittanceByCommercial(summary.getRemittanceByCommercial())
                .monthRate(monthRate)
                .monthComparison(comparison)
                .monthCoverage(coverage)
                .targets(targets)
                .trend(trend(effectiveEnd, manager, commercial))
                .priorityLate(priority)
                .attention(attention)
                .team(rows)
                .build();
    }

    /** Chef : toujours lui-même. Gestionnaire / admin : le chef demandé, ou null pour tous. */
    String resolveManager(String requested) {
        if (access.isSupervisor()) {
            return StringUtils.hasText(requested) ? requested.trim() : null;
        }
        return access.resolveRecoveryManager(null);
    }

    // --- Mois en cours et mois précédent -------------------------------------------------

    record MonthWindow(LocalDate currentStart, LocalDate currentEnd, LocalDate previousStart, LocalDate previousEnd) {
        static MonthWindow of(LocalDate end) {
            LocalDate currentStart = end.withDayOfMonth(1);
            LocalDate previousStart = currentStart.minusMonths(1);
            int day = Math.min(end.getDayOfMonth(), YearMonth.from(previousStart).lengthOfMonth());
            return new MonthWindow(currentStart, end, previousStart, previousStart.withDayOfMonth(day));
        }
    }

    private RecoveryBoardDto.MonthComparison comparison(MonthWindow window, String manager, String commercial) {
        double current = sum(operationRepository.sumAmountCollected(
                window.currentStart(), window.currentEnd(), manager, commercial));
        double previous = sum(operationRepository.sumAmountCollected(
                window.previousStart(), window.previousEnd(), manager, commercial));
        return RecoveryBoardDto.MonthComparison.builder()
                .currentStart(window.currentStart())
                .currentEnd(window.currentEnd())
                .currentAmount(current)
                .previousStart(window.previousStart())
                .previousEnd(window.previousEnd())
                .previousAmount(previous)
                .changePercent(change(current, previous))
                .build();
    }

    static Double change(double current, double previous) {
        if (previous <= 0d) {
            return null;
        }
        return round((current - previous) * 100d / previous);
    }

    static double elapsedRatio(YearMonth month, LocalDate today) {
        YearMonth current = YearMonth.from(today);
        if (month.isBefore(current)) {
            return 1d;
        }
        if (month.isAfter(current)) {
            return 0d;
        }
        return round((double) today.getDayOfMonth() / month.lengthOfMonth() * 100d) / 100d;
    }

    // --- Tendance --------------------------------------------------------------------------

    private List<RecoveryBoardDto.DayPoint> trend(LocalDate end, String manager, String commercial) {
        LocalDate start = end.minusDays(TREND_DAYS - 1L);
        Map<LocalDate, Object[]> byDay = new HashMap<>();
        for (Object[] row : operationRepository.sumByDay(start, end, manager, commercial)) {
            if (row != null && row.length >= 3 && row[0] instanceof LocalDate date) {
                byDay.put(date, row);
            }
        }
        List<RecoveryBoardDto.DayPoint> points = new ArrayList<>(TREND_DAYS);
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            Object[] row = byDay.get(day);
            points.add(RecoveryBoardDto.DayPoint.builder()
                    .date(day)
                    .operationsCount(row != null ? toInt(row[1]) : 0)
                    .amount(row != null ? toDouble(row[2]) : 0d)
                    .build());
        }
        return points;
    }

    // --- Retards prioritaires --------------------------------------------------------------

    private List<RecoveryBoardDto.PriorityLate> priorityLate(List<CreditLateDTO> delai, String commercial) {
        List<CreditLateDTO> top = delai.stream()
                .filter(late -> commercial == null || commercial.equalsIgnoreCase(late.getCollector()))
                .filter(late -> safe(late.getTotalAmountRemaining()) > 0d)
                .sorted(Comparator.comparingDouble((CreditLateDTO late) -> -safe(late.getTotalAmountRemaining()))
                        .thenComparing(late -> -late.getLateDaysDelai()))
                .limit(PRIORITY_LIMIT)
                .toList();
        Map<Long, CreditFieldControl> latest = latestControls(top.stream()
                .map(CreditLateDTO::getId).filter(Objects::nonNull).toList());
        List<RecoveryBoardDto.PriorityLate> rows = new ArrayList<>(top.size());
        for (CreditLateDTO late : top) {
            CreditFieldControl control = late.getId() != null ? latest.get(late.getId()) : null;
            rows.add(RecoveryBoardDto.PriorityLate.builder()
                    .creditId(late.getId())
                    .reference(late.getReference())
                    .clientName(late.getClientName())
                    .clientQuarter(late.getClientQuarter())
                    .commercialUsername(late.getCollector())
                    .amountDue(safe(late.getTotalAmountRemaining()))
                    .lateDays(late.getLateDaysDelai())
                    .expectedEndDate(late.getExpectedEndDate())
                    .latestControlStatus(control != null && control.getStatus() != null ? control.getStatus().name() : null)
                    .latestObservedAt(control != null ? control.getObservedAt() : null)
                    .latestDifferenceAmount(control != null ? control.getDifferenceAmount() : null)
                    .latestObservedBy(control != null ? control.getObservedBy() : null)
                    .build());
        }
        return rows;
    }

    private Map<Long, CreditFieldControl> latestControls(List<Long> creditIds) {
        Map<Long, CreditFieldControl> best = new HashMap<>();
        if (creditIds.isEmpty()) {
            return best;
        }
        for (CreditFieldControl control : creditFieldControlRepository.findLatestByCreditIds(creditIds)) {
            Long creditId = control.getCredit() != null ? control.getCredit().getId() : null;
            if (creditId == null) {
                continue;
            }
            CreditFieldControl current = best.get(creditId);
            if (current == null || isNewer(control, current)) {
                best.put(creditId, control);
            }
        }
        return best;
    }

    private static boolean isNewer(CreditFieldControl candidate, CreditFieldControl current) {
        LocalDateTime a = candidate.getObservedAt();
        LocalDateTime b = current.getObservedAt();
        if (a == null) {
            return false;
        }
        if (b == null || !a.isEqual(b)) {
            return b == null || a.isAfter(b);
        }
        return (candidate.getId() != null ? candidate.getId() : 0L) > (current.getId() != null ? current.getId() : 0L);
    }

    // --- Vue équipe ------------------------------------------------------------------------

    private List<RecoveryBoardDto.ManagerRow> teamRows(LocalDate startDate, LocalDate endDate, LocalDate monthStart,
                                                       LocalDate effectiveEnd, MonthWindow window,
                                                       double latePortfolioDue, String commercial, LocalDate today) {
        Map<String, String> names = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (User user : userRepository
                .findByUserAccount_userProfil_nameAndUserAccount_activeIsTrueOrderByUserAccount_username(
                        RECOVERY_MANAGER_PROFILE)) {
            if (StringUtils.hasText(user.getUsername())) {
                names.put(user.getUsername(), displayName(user));
            }
        }
        Map<String, double[]> period = byManager(operationRepository.summarizeByRecoveryManager(startDate, endDate, commercial));
        Map<String, double[]> monthOps = byManager(operationRepository.summarizeByRecoveryManager(
                monthStart, YearMonth.from(endDate).atEndOfMonth(), commercial));
        Map<String, double[]> current = byManager(operationRepository.summarizeByRecoveryManager(
                window.currentStart(), window.currentEnd(), commercial));
        Map<String, double[]> previous = byManager(operationRepository.summarizeByRecoveryManager(
                window.previousStart(), window.previousEnd(), commercial));
        period.keySet().forEach(username -> names.putIfAbsent(username, null));

        Map<String, LocalDate> lastDates = new HashMap<>();
        for (Object[] row : operationRepository.findLastOperationDateByRecoveryManager(effectiveEnd)) {
            if (row != null && row.length >= 2 && row[0] instanceof String username && row[1] instanceof LocalDate date) {
                lastDates.put(username.toLowerCase(Locale.ROOT), date);
            }
        }
        Map<String, RecoveryFieldDayPlan> plans = new HashMap<>();
        for (RecoveryFieldDayPlan plan : planRepository.findByPlanDate(today)) {
            if (plan.getRecoveryManagerUsername() == null) {
                continue;
            }
            String key = plan.getRecoveryManagerUsername().toLowerCase(Locale.ROOT);
            RecoveryFieldDayPlan existing = plans.get(key);
            if (existing == null || planRank(plan) > planRank(existing)) {
                plans.put(key, plan);
            }
        }

        LocalDate monthEnd = effectiveEnd.isBefore(monthStart) ? monthStart : effectiveEnd;
        List<RecoveryBoardDto.ManagerRow> rows = new ArrayList<>();
        for (Map.Entry<String, String> entry : names.entrySet()) {
            String username = entry.getKey();
            String key = username.toLowerCase(Locale.ROOT);
            RecoveryManagerActivityDto periodActivity = activityService.getActivity(startDate, endDate, username, commercial);
            RecoveryManagerActivityDto monthActivity = activityService.getActivity(monthStart, monthEnd, username, commercial);
            double monthCollected = value(monthOps, username, 1);
            double currentAmount = value(current, username, 1);
            double previousAmount = value(previous, username, 1);
            RecoveryFieldDayPlan plan = plans.get(key);
            rows.add(RecoveryBoardDto.ManagerRow.builder()
                    .username(username)
                    .displayName(entry.getValue())
                    .collectedAmount(value(period, username, 1))
                    .operationsCount((int) value(period, username, 0))
                    .monthCollectedAmount(monthCollected)
                    .monthRatePercent(rate(monthCollected, latePortfolioDue))
                    .previousMonthAmount(previousAmount)
                    .changePercent(change(currentAmount, previousAmount))
                    .creditCoveragePercent(monthActivity.getCreditCoveragePercent())
                    .tontineCoveragePercent(monthActivity.getTontineCoveragePercent())
                    .creditControlsDone(monthActivity.getCreditControlsDone())
                    .creditPortfolioTotal(monthActivity.getCreditPortfolioTotal())
                    .tontineControlsDone(monthActivity.getTontineControlsDone())
                    .tontinePortfolioTotal(monthActivity.getTontinePortfolioTotal())
                    .ecartsCount(periodActivity.getCreditControlsEcart() + periodActivity.getTontineControlsEcart())
                    .carnetVerifications(periodActivity.getCreditCarnetVerifications()
                            + periodActivity.getTontineCarnetVerifications())
                    .lastOperationDate(lastDates.get(key))
                    .todayPlanStatus(plan != null && plan.getStatus() != null ? plan.getStatus().name() : null)
                    .todayPlanQuarters(plan != null ? readList(plan.getQuartersJson()) : List.of())
                    .build());
        }
        return rows;
    }

    private static int planRank(RecoveryFieldDayPlan plan) {
        if (plan.getStatus() == null) {
            return 0;
        }
        return switch (plan.getStatus()) {
            case ACTIVE -> 3;
            case CLOSED -> 2;
            case DRAFT -> 1;
        };
    }

    private static Map<String, double[]> byManager(List<Object[]> rows) {
        Map<String, double[]> map = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        if (rows == null) {
            return map;
        }
        for (Object[] row : rows) {
            if (row != null && row.length >= 3 && row[0] instanceof String username && StringUtils.hasText(username)) {
                double[] values = map.computeIfAbsent(username, ignored -> new double[2]);
                values[0] += toDouble(row[1]);
                values[1] += toDouble(row[2]);
            }
        }
        return map;
    }

    private static double value(Map<String, double[]> map, String username, int index) {
        double[] values = map.get(username);
        return values != null ? values[index] : 0d;
    }

    private static String displayName(User user) {
        String name = String.join(" ", List.of(
                user.getFirstname() != null ? user.getFirstname().trim() : "",
                user.getLastname() != null ? user.getLastname().trim() : "")).trim();
        return name.isEmpty() ? null : name;
    }

    private List<String> readList(String json) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() { });
        } catch (Exception e) {
            log.warn("Quartiers de tournée illisibles : {}", e.getMessage());
            return List.of();
        }
    }

    // --- Points d'attention ----------------------------------------------------------------

    private List<RecoveryBoardDto.Attention> pendingEcarts(String manager, String commercial) {
        Map<String, List<CarnetEcartItemDto>> byObserver = new LinkedHashMap<>();
        for (CarnetEcartItemDto item : ecartService.listPendingForBoard(commercial)) {
            String observer = item.getObservedBy() != null ? item.getObservedBy().trim() : "";
            if (manager != null && !manager.equalsIgnoreCase(observer)) {
                continue;
            }
            byObserver.computeIfAbsent(manager != null ? manager : observer.toLowerCase(Locale.ROOT),
                    ignored -> new ArrayList<>()).add(item);
        }
        List<RecoveryBoardDto.Attention> attention = new ArrayList<>();
        for (Map.Entry<String, List<CarnetEcartItemDto>> entry : byObserver.entrySet()) {
            List<CarnetEcartItemDto> items = entry.getValue();
            Set<String> commercials = new LinkedHashSet<>();
            items.forEach(item -> {
                if (StringUtils.hasText(item.getCommercialUsername())) {
                    commercials.add(item.getCommercialUsername());
                }
            });
            attention.add(RecoveryBoardDto.Attention.builder()
                    .type("PENDING_ECARTS")
                    .severity(HIGH)
                    .recoveryManagerUsername(entry.getKey().isEmpty() ? null : entry.getKey())
                    .count(items.size())
                    .amount(items.stream().mapToDouble(i -> i.getAcceptableAmount() + i.getPendingInverseAmount()).sum())
                    .commercials(new ArrayList<>(commercials))
                    .build());
        }
        return attention;
    }

    static List<RecoveryBoardDto.Attention> controlAttention(List<RecoveryBoardDto.PriorityLate> priority,
                                                             LocalDate effectiveEnd) {
        List<RecoveryBoardDto.Attention> attention = new ArrayList<>();
        List<RecoveryBoardDto.PriorityLate> never = priority.stream()
                .filter(row -> row.getLatestControlStatus() == null).toList();
        if (!never.isEmpty()) {
            attention.add(RecoveryBoardDto.Attention.builder()
                    .type("NEVER_CONTROLLED")
                    .severity(HIGH)
                    .count(never.size())
                    .amount(never.stream().mapToDouble(RecoveryBoardDto.PriorityLate::getAmountDue).sum())
                    .commercials(distinctCommercials(never))
                    .build());
        }
        LocalDateTime limit = effectiveEnd.minusDays(STALE_CONTROL_DAYS).atStartOfDay();
        List<RecoveryBoardDto.PriorityLate> stale = priority.stream()
                .filter(row -> row.getLatestObservedAt() != null && row.getLatestObservedAt().isBefore(limit))
                .toList();
        if (!stale.isEmpty()) {
            attention.add(RecoveryBoardDto.Attention.builder()
                    .type("STALE_CONTROL")
                    .severity(MEDIUM)
                    .count(stale.size())
                    .amount(stale.stream().mapToDouble(RecoveryBoardDto.PriorityLate::getAmountDue).sum())
                    .threshold((double) STALE_CONTROL_DAYS)
                    .commercials(distinctCommercials(stale))
                    .lastDate(stale.stream().map(row -> row.getLatestObservedAt().toLocalDate())
                            .min(Comparator.naturalOrder()).orElse(null))
                    .build());
        }
        return attention;
    }

    private static List<String> distinctCommercials(List<RecoveryBoardDto.PriorityLate> rows) {
        return rows.stream().map(RecoveryBoardDto.PriorityLate::getCommercialUsername)
                .filter(StringUtils::hasText).distinct().toList();
    }

    /** Objectif au prorata des jours écoulés du mois ; aucune alerte sans objectif. */
    static List<RecoveryBoardDto.Attention> targetAttention(String manager, double ratePercent, double coveragePercent,
                                                            RecoveryBoardDto.Targets targets) {
        List<RecoveryBoardDto.Attention> attention = new ArrayList<>();
        if (targets.getMonthlyRatePercent() != null) {
            double expected = round(targets.getMonthlyRatePercent() * targets.getElapsedRatio());
            if (expected > 0d && ratePercent < expected) {
                attention.add(RecoveryBoardDto.Attention.builder()
                        .type("RATE_BELOW_TARGET").severity(MEDIUM).recoveryManagerUsername(manager)
                        .value(ratePercent).threshold(expected).build());
            }
        }
        if (targets.getCoveragePercent() != null) {
            double expected = round(targets.getCoveragePercent() * targets.getElapsedRatio());
            if (expected > 0d && coveragePercent < expected) {
                attention.add(RecoveryBoardDto.Attention.builder()
                        .type("COVERAGE_BELOW_TARGET").severity(MEDIUM).recoveryManagerUsername(manager)
                        .value(coveragePercent).threshold(expected).build());
            }
        }
        return attention;
    }

    static java.util.Optional<RecoveryBoardDto.Attention> inactive(RecoveryBoardDto.ManagerRow row, LocalDate effectiveEnd) {
        LocalDate last = row.getLastOperationDate();
        long days = last != null ? ChronoUnit.DAYS.between(last, effectiveEnd) : -1;
        if (last != null && days < INACTIVE_DAYS) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(RecoveryBoardDto.Attention.builder()
                .type("MANAGER_INACTIVE").severity(MEDIUM).recoveryManagerUsername(row.getUsername())
                .value(last != null ? (double) days : null)
                .threshold((double) INACTIVE_DAYS)
                .lastDate(last)
                .build());
    }

    // --- Couverture et objectifs -----------------------------------------------------------

    private static RecoveryBoardDto.Coverage coverage(RecoveryManagerActivityDto activity) {
        return RecoveryBoardDto.Coverage.builder()
                .creditControlsDone(activity.getCreditControlsDone())
                .creditPortfolioTotal(activity.getCreditPortfolioTotal())
                .creditCoveragePercent(activity.getCreditCoveragePercent())
                .tontineControlsDone(activity.getTontineControlsDone())
                .tontinePortfolioTotal(activity.getTontinePortfolioTotal())
                .tontineCoveragePercent(activity.getTontineCoveragePercent())
                .build();
    }

    static double combinedCoverage(RecoveryBoardDto.Coverage coverage) {
        return combined(coverage.getCreditControlsDone() + coverage.getTontineControlsDone(),
                coverage.getCreditPortfolioTotal() + coverage.getTontinePortfolioTotal());
    }

    static double combinedCoverage(RecoveryBoardDto.ManagerRow row) {
        return combined(row.getCreditControlsDone() + row.getTontineControlsDone(),
                row.getCreditPortfolioTotal() + row.getTontinePortfolioTotal());
    }

    private static double combined(long done, long total) {
        return total > 0 ? round(done * 100d / total) : 0d;
    }

    Double readTarget(String key) {
        String raw = parameterService.getValue(key);
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            double value = Double.parseDouble(raw.trim().replace(',', '.').replace("%", ""));
            return value > 0d && value <= 100d ? value : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // --- Outils ----------------------------------------------------------------------------

    static double rate(double collected, double due) {
        return due > 0d ? round(collected * 100d / due) : 0d;
    }

    static double round(double value) {
        return Math.round(value * 100d) / 100d;
    }

    private static double sum(Double value) {
        return value != null ? value : 0d;
    }

    private static double safe(Double value) {
        return value != null ? value : 0d;
    }

    private static double toDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0d;
    }

    private static int toInt(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }
}
