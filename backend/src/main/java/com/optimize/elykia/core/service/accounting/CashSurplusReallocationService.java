package com.optimize.elykia.core.service.accounting;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.report.SurplusReallocationDto;
import com.optimize.elykia.core.dto.report.SurplusReallocationLineDto;
import com.optimize.elykia.core.entity.report.CashDeposit;
import com.optimize.elykia.core.entity.report.CashPeriodRemittance;
import com.optimize.elykia.core.entity.report.CashSurplusReallocation;
import com.optimize.elykia.core.entity.report.CashSurplusReallocationLine;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.CashPeriodRemittanceRepository;
import com.optimize.elykia.core.repository.CashSurplusReallocationRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.DebtDocumentRepository;
import com.optimize.elykia.core.service.report.DailyCommercialReportPersistence;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.util.CashDepositCategoryCalculator;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class CashSurplusReallocationService {

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final CashDepositRepository cashDepositRepository;
    private final DailyCommercialReportRepository dailyReportRepository;
    private final DailyCommercialReportPersistence reportPersistence;
    private final CashSurplusReallocationRepository reallocationRepository;
    private final CashPeriodRemittanceRepository remittanceRepository;
    private final DebtDocumentRepository debtDocumentRepository;
    private final DailyOperationService dailyOperationService;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<SurplusReallocationDto> listForPeriod(String commercialUsername, LocalDate startDate,
            LocalDate endDate) {
        if (!StringUtils.hasText(commercialUsername) || startDate == null || endDate == null) {
            return List.of();
        }
        return reallocationRepository.findOverlappingPeriod(commercialUsername.trim(), startDate, endDate).stream()
                .sorted((a, b) -> b.getPerformedAt().compareTo(a.getPerformedAt()))
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public SurplusReallocationDto preview(String commercialUsername, LocalDate startDate, LocalDate endDate) {
        User currentUser = userService.getCurrentUser();
        assertCanReallocate(currentUser);
        return compute(commercialUsername, startDate, endDate, currentUser.getUsername()).toDto();
    }

    public SurplusReallocationDto reallocate(String commercialUsername, LocalDate startDate, LocalDate endDate) {
        User currentUser = userService.getCurrentUser();
        assertCanReallocate(currentUser);
        AllocationPlan plan = compute(commercialUsername, startDate, endDate, currentUser.getUsername());
        apply(plan);

        CashSurplusReallocation reallocation = new CashSurplusReallocation();
        reallocation.setCommercialUsername(plan.commercial);
        reallocation.setPeriodStart(plan.periodStart);
        reallocation.setPeriodEnd(plan.periodEnd);
        reallocation.setPerformedAt(plan.performedAt);
        reallocation.setPerformedBy(currentUser.getUsername());
        reallocation.setSurplusBefore(plan.surplusBefore);
        reallocation.setCreditAllocated(plan.creditAllocated);
        reallocation.setTontineAllocated(plan.tontineAllocated);
        reallocation.setNewBalanceAllocated(plan.newBalanceAllocated);
        reallocation.setSurplusRemaining(plan.surplusRemaining);
        reallocation.setRemainingBefore(plan.remainingBefore);
        reallocation.setRemainingAfter(plan.remainingAfter);
        reallocation.setTotalReallocated(plan.totalReallocated);
        for (CashSurplusReallocationLine line : plan.lines) {
            reallocation.addLine(line);
        }
        CashSurplusReallocation saved = reallocationRepository.save(reallocation);

        String refs = plan.lines.stream()
                .map(l -> l.getDepositReference() != null ? l.getDepositReference() : String.valueOf(l.getCashDepositId()))
                .distinct()
                .reduce((a, b) -> a + ", " + b)
                .orElse("-");
        String targets = plan.lines.stream()
                .map(CashSurplusReallocationLine::getTargetDate)
                .filter(d -> d != null)
                .distinct()
                .map(d -> d.format(DAY_FMT))
                .reduce((a, b) -> a + ", " + b)
                .orElse("-");
        String description = String.format(Locale.FRANCE,
                "Équilibrage par %s sur %s – %s. Surplus avant: %.0f. Réaffecté: %.0f (crédit %.0f, tontine %.0f, solde %.0f). Jours couverts: %s. Surplus restant: %.0f. Reste après: %.0f. Versements: %s",
                currentUser.getUsername(),
                startDate.format(DAY_FMT),
                endDate.format(DAY_FMT),
                plan.surplusBefore,
                plan.totalReallocated,
                plan.creditAllocated,
                plan.tontineAllocated,
                plan.newBalanceAllocated,
                targets,
                saved.getSurplusRemaining(),
                saved.getRemainingAfter(),
                refs);

        dailyOperationService.logOperationInCurrentTransaction(
                plan.commercial,
                OperationType.SURPLUS_REALLOCATION,
                plan.totalReallocated,
                plan.commercial + " · " + startDate.format(DAY_FMT) + " – " + endDate.format(DAY_FMT),
                description,
                0.0,
                0.0,
                plan.performedAt.toLocalDate());

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public void attachHistoricalRemaining(List<DailyCommercialReport> reports, LocalDate periodStart) {
        if (reports == null || reports.isEmpty() || periodStart == null) {
            return;
        }
        List<String> usernames = reports.stream()
                .map(DailyCommercialReport::getCommercialUsername)
                .filter(StringUtils::hasText)
                .map(name -> name.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
        if (usernames.isEmpty()) {
            return;
        }
        Set<String> locked = lockedKeysBefore(usernames, periodStart);
        Map<String, Double> totals = new HashMap<>();
        for (DailyCommercialReport day : dailyReportRepository.findBeforeDateForCommercials(periodStart, usernames)) {
            if (day.getDate() == null || !StringUtils.hasText(day.getCommercialUsername())) {
                continue;
            }
            if (locked.contains(lockKey(day.getCommercialUsername(), day.getDate()))) {
                continue;
            }
            double need = dayNeed(day);
            if (need > 0.01) {
                totals.merge(day.getCommercialUsername().trim().toUpperCase(Locale.ROOT), need, Double::sum);
            }
        }
        for (DailyCommercialReport report : reports) {
            String key = report.getCommercialUsername() == null
                    ? ""
                    : report.getCommercialUsername().trim().toUpperCase(Locale.ROOT);
            report.setHistoricalRemaining(totals.getOrDefault(key, 0.0));
        }
    }

    private AllocationPlan compute(String commercialUsername, LocalDate startDate, LocalDate endDate,
            String performedBy) {
        if (!StringUtils.hasText(commercialUsername) || startDate == null || endDate == null) {
            throw new RuntimeException("Commercial et période sont obligatoires.");
        }
        if (endDate.isBefore(startDate)) {
            throw new RuntimeException("La date de fin doit être postérieure ou égale à la date de début.");
        }
        String commercial = commercialUsername.trim();
        List<DailyCommercialReport> history = dailyReportRepository
                .findByCommercialUsernameIgnoreCaseAndDateLessThanEqualOrderByDateAsc(commercial, endDate);
        if (history.isEmpty()) {
            throw new RuntimeException("Aucun rapport journalier pour ce commercial sur la période.");
        }

        Set<LocalDate> lockedDays = new HashSet<>(debtDocumentRepository.findActiveCashDaysUpTo(commercial, endDate));
        Map<LocalDate, DailyCommercialReport> reportsByDate = new LinkedHashMap<>();
        for (DailyCommercialReport report : history) {
            if (report.getDate() != null) {
                reportsByDate.put(report.getDate(), report);
            }
        }

        double surplusBefore = 0.0;
        for (DailyCommercialReport report : history) {
            if (report.getDate() == null || report.getDate().isBefore(startDate) || lockedDays.contains(report.getDate())) {
                continue;
            }
            surplusBefore += safe(report.getTotalSurplusAmountDeposited());
        }
        if (surplusBefore <= 0.01) {
            throw new RuntimeException("Aucun surplus non catégorisé à équilibrer sur cette période.");
        }

        List<DayNeed> targets = new ArrayList<>();
        double remainingBefore = 0.0;
        for (DailyCommercialReport report : history) {
            if (report.getDate() == null || lockedDays.contains(report.getDate())) {
                continue;
            }
            double credit = creditNeed(report);
            double tontine = tontineNeed(report);
            double balance = newBalanceNeed(report);
            double total = credit + tontine + balance;
            if (total <= 0.01) {
                continue;
            }
            targets.add(new DayNeed(report, credit, tontine, balance));
            remainingBefore += total;
        }
        if (remainingBefore <= 0.01) {
            throw new RuntimeException("Aucun manquant crédit, tontine ou solde à combler.");
        }

        List<CashDeposit> surplusDeposits = cashDepositRepository.findSurplusDepositsForPeriod(commercial, startDate,
                endDate);
        List<DepositPool> pools = new ArrayList<>();
        for (CashDeposit deposit : surplusDeposits) {
            if (deposit.getDate() != null && lockedDays.contains(deposit.getDate())) {
                continue;
            }
            double available = safe(deposit.getSurplusAmount());
            if (available <= 0.01) {
                continue;
            }
            DailyCommercialReport source = reportsByDate.get(deposit.getDate());
            if (source == null) {
                throw new IllegalStateException(
                        "Rapport journalier introuvable pour le versement " + deposit.getReference());
            }
            pools.add(new DepositPool(deposit, source, available));
        }
        if (pools.isEmpty()) {
            throw new RuntimeException("Aucun versement avec surplus trouvé sur cette période.");
        }

        List<CashSurplusReallocationLine> lines = new ArrayList<>();
        int targetIndex = 0;
        double creditAllocated = 0.0;
        double tontineAllocated = 0.0;
        double newBalanceAllocated = 0.0;

        for (DepositPool pool : pools) {
            while (pool.surplusLeft > 0.01 && targetIndex < targets.size()) {
                DayNeed need = targets.get(targetIndex);
                if (need.remaining() <= 0.01) {
                    targetIndex++;
                    continue;
                }
                double toCredit = Math.min(pool.surplusLeft, need.credit);
                double left = pool.surplusLeft - toCredit;
                double toTontine = Math.min(left, need.tontine);
                left -= toTontine;
                double toNewBalance = Math.min(left, need.newBalance);
                double taken = toCredit + toTontine + toNewBalance;
                if (taken <= 0.01) {
                    targetIndex++;
                    continue;
                }
                need.credit -= toCredit;
                need.tontine -= toTontine;
                need.newBalance -= toNewBalance;
                need.coverageCredit += toCredit;
                need.coverageTontine += toTontine;
                need.coverageNewBalance += toNewBalance;
                pool.surplusLeft -= taken;
                pool.creditAdd += toCredit;
                pool.tontineAdd += toTontine;
                pool.newBalanceAdd += toNewBalance;
                pool.sourceSurplusTaken += taken;

                CashSurplusReallocationLine line = new CashSurplusReallocationLine();
                line.setCashDepositId(pool.deposit.getId());
                line.setDepositReference(pool.deposit.getReference());
                line.setDepositDate(pool.deposit.getDate());
                line.setTargetDate(need.report.getDate());
                line.setSurplusTaken(taken);
                line.setCreditAllocated(toCredit);
                line.setTontineAllocated(toTontine);
                line.setNewBalanceAllocated(toNewBalance);
                lines.add(line);

                creditAllocated += toCredit;
                tontineAllocated += toTontine;
                newBalanceAllocated += toNewBalance;
                if (need.remaining() <= 0.01) {
                    targetIndex++;
                }
            }
        }

        double totalReallocated = creditAllocated + tontineAllocated + newBalanceAllocated;
        if (totalReallocated <= 0.01) {
            throw new RuntimeException("Aucun montant n'a pu être réaffecté.");
        }

        AllocationPlan plan = new AllocationPlan();
        plan.commercial = commercial;
        plan.periodStart = startDate;
        plan.periodEnd = endDate;
        plan.performedAt = LocalDateTime.now();
        plan.performedBy = performedBy;
        plan.surplusBefore = surplusBefore;
        plan.creditAllocated = creditAllocated;
        plan.tontineAllocated = tontineAllocated;
        plan.newBalanceAllocated = newBalanceAllocated;
        plan.totalReallocated = totalReallocated;
        plan.surplusRemaining = Math.max(0.0, surplusBefore - totalReallocated);
        plan.remainingBefore = remainingBefore;
        plan.remainingAfter = Math.max(0.0, remainingBefore - totalReallocated);
        plan.lines = lines;
        plan.pools = pools;
        plan.targets = targets;
        return plan;
    }

    private void apply(AllocationPlan plan) {
        Set<Long> remittanceIds = new HashSet<>();
        Map<Long, DailyCommercialReport> touched = new LinkedHashMap<>();
        for (DepositPool pool : plan.pools) {
            if (pool.creditAdd + pool.tontineAdd + pool.newBalanceAdd <= 0.01) {
                continue;
            }
            CashDeposit deposit = pool.deposit;
            deposit.setCreditAmount(safe(deposit.getCreditAmount()) + pool.creditAdd);
            deposit.setTontineAmount(safe(deposit.getTontineAmount()) + pool.tontineAdd);
            deposit.setNewBalanceAmount(safe(deposit.getNewBalanceAmount()) + pool.newBalanceAdd);
            deposit.setSurplusAmount(Math.max(0.0, safe(deposit.getSurplusAmount()) - pool.sourceSurplusTaken));
            CashDepositCategoryCalculator.validateCategorySplit(
                    deposit.getAmount(),
                    deposit.getCreditAmount(),
                    deposit.getTontineAmount(),
                    deposit.getNewBalanceAmount(),
                    deposit.getSurplusAmount());
            cashDepositRepository.save(deposit);
            if (deposit.getRemittance() != null && deposit.getRemittance().getId() != null) {
                remittanceIds.add(deposit.getRemittance().getId());
            }
            DailyCommercialReport source = pool.sourceReport;
            source.setTotalSurplusAmountDeposited(Math.max(0.0,
                    safe(source.getTotalSurplusAmountDeposited()) - pool.sourceSurplusTaken));
            touched.put(source.getId() != null ? source.getId() : -deposit.getId(), source);
        }
        for (DayNeed need : plan.targets) {
            if (need.coverageCredit + need.coverageTontine + need.coverageNewBalance <= 0.01) {
                continue;
            }
            DailyCommercialReport report = need.report;
            report.setSurplusCoverageCredit(safe(report.getSurplusCoverageCredit()) + need.coverageCredit);
            report.setSurplusCoverageTontine(safe(report.getSurplusCoverageTontine()) + need.coverageTontine);
            report.setSurplusCoverageNewBalance(safe(report.getSurplusCoverageNewBalance()) + need.coverageNewBalance);
            long key = report.getId() != null ? report.getId() : report.getDate().toEpochDay();
            touched.put(key, report);
        }
        for (DailyCommercialReport report : touched.values()) {
            reportPersistence.save(report);
        }
        for (Long remittanceId : remittanceIds) {
            refreshRemittanceCategories(remittanceId);
        }
    }

    private Set<String> lockedKeysBefore(Collection<String> usernames, LocalDate before) {
        Set<String> locked = new HashSet<>();
        for (Object[] row : debtDocumentRepository.findActiveCashDaysBefore(usernames, before)) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
                continue;
            }
            locked.add(lockKey(String.valueOf(row[0]), (LocalDate) row[1]));
        }
        return locked;
    }

    private static String lockKey(String username, LocalDate date) {
        return username.trim().toUpperCase(Locale.ROOT) + "|" + date;
    }

    private static double dayNeed(DailyCommercialReport report) {
        return creditNeed(report) + tontineNeed(report) + newBalanceNeed(report);
    }

    private static double creditNeed(DailyCommercialReport report) {
        return Math.max(0.0, CashDepositCategoryCalculator.creditToDeposit(report)
                - safe(report.getTotalCreditAmountDeposited())
                - safe(report.getSurplusCoverageCredit()));
    }

    private static double tontineNeed(DailyCommercialReport report) {
        return Math.max(0.0, CashDepositCategoryCalculator.tontineToDeposit(report)
                - safe(report.getTotalTontineAmountDeposited())
                - safe(report.getSurplusCoverageTontine()));
    }

    private static double newBalanceNeed(DailyCommercialReport report) {
        return Math.max(0.0, CashDepositCategoryCalculator.newBalanceToDeposit(report)
                - safe(report.getTotalNewBalanceAmountDeposited())
                - safe(report.getSurplusCoverageNewBalance()));
    }

    private void refreshRemittanceCategories(Long remittanceId) {
        CashPeriodRemittance remittance = remittanceRepository.findById(remittanceId).orElse(null);
        if (remittance == null) {
            return;
        }
        List<CashDeposit> linked = cashDepositRepository.findPositiveByRemittanceId(remittanceId);
        double credit = 0.0;
        double tontine = 0.0;
        double newBalance = 0.0;
        double total = 0.0;
        for (CashDeposit deposit : linked) {
            credit += safe(deposit.getCreditAmount());
            tontine += safe(deposit.getTontineAmount());
            newBalance += safe(deposit.getNewBalanceAmount());
            total += safe(deposit.getAmount());
        }
        remittance.setCreditAmount(credit);
        remittance.setTontineAmount(tontine);
        remittance.setNewBalanceAmount(newBalance);
        remittance.setTotalAmount(total);
        remittanceRepository.save(remittance);
    }

    private void assertCanReallocate(User currentUser) {
        if (currentUser == null
                || (!currentUser.is(UserProfilConstant.GESTIONNAIRE)
                        && !currentUser.is(UserProfilConstant.SECRETARY)
                        && !currentUser.is(UserProfilConstant.ADMIN)
                        && !currentUser.is(UserProfilConstant.SU))) {
            throw new RuntimeException("Seul le gestionnaire, la secrétaire ou l'administrateur peut équilibrer un surplus.");
        }
    }

    private SurplusReallocationDto toDto(CashSurplusReallocation entity) {
        List<SurplusReallocationLineDto> lines = entity.getLines() == null ? List.of()
                : entity.getLines().stream()
                        .map(line -> SurplusReallocationLineDto.builder()
                                .cashDepositId(line.getCashDepositId())
                                .depositReference(line.getDepositReference())
                                .depositDate(line.getDepositDate())
                                .targetDate(line.getTargetDate())
                                .surplusTaken(line.getSurplusTaken())
                                .creditAllocated(line.getCreditAllocated())
                                .tontineAllocated(line.getTontineAllocated())
                                .newBalanceAllocated(line.getNewBalanceAllocated())
                                .build())
                        .toList();
        return SurplusReallocationDto.builder()
                .id(entity.getId())
                .commercialUsername(entity.getCommercialUsername())
                .periodStart(entity.getPeriodStart())
                .periodEnd(entity.getPeriodEnd())
                .performedAt(entity.getPerformedAt())
                .performedBy(entity.getPerformedBy())
                .surplusBefore(entity.getSurplusBefore())
                .creditAllocated(entity.getCreditAllocated())
                .tontineAllocated(entity.getTontineAllocated())
                .newBalanceAllocated(entity.getNewBalanceAllocated())
                .surplusRemaining(entity.getSurplusRemaining())
                .remainingBefore(entity.getRemainingBefore())
                .remainingAfter(entity.getRemainingAfter())
                .totalReallocated(entity.getTotalReallocated())
                .lines(lines)
                .build();
    }

    private static double safe(Double value) {
        return value != null ? value : 0.0;
    }

    private static final class DayNeed {
        private final DailyCommercialReport report;
        private double credit;
        private double tontine;
        private double newBalance;
        private double coverageCredit;
        private double coverageTontine;
        private double coverageNewBalance;

        private DayNeed(DailyCommercialReport report, double credit, double tontine, double newBalance) {
            this.report = report;
            this.credit = credit;
            this.tontine = tontine;
            this.newBalance = newBalance;
        }

        private double remaining() {
            return credit + tontine + newBalance;
        }
    }

    private static final class DepositPool {
        private final CashDeposit deposit;
        private final DailyCommercialReport sourceReport;
        private double surplusLeft;
        private double creditAdd;
        private double tontineAdd;
        private double newBalanceAdd;
        private double sourceSurplusTaken;

        private DepositPool(CashDeposit deposit, DailyCommercialReport sourceReport, double surplusLeft) {
            this.deposit = deposit;
            this.sourceReport = sourceReport;
            this.surplusLeft = surplusLeft;
        }
    }

    private static final class AllocationPlan {
        private String commercial;
        private LocalDate periodStart;
        private LocalDate periodEnd;
        private LocalDateTime performedAt;
        private String performedBy;
        private double surplusBefore;
        private double creditAllocated;
        private double tontineAllocated;
        private double newBalanceAllocated;
        private double surplusRemaining;
        private double remainingBefore;
        private double remainingAfter;
        private double totalReallocated;
        private List<CashSurplusReallocationLine> lines = List.of();
        private List<DepositPool> pools = List.of();
        private List<DayNeed> targets = List.of();

        private SurplusReallocationDto toDto() {
            List<SurplusReallocationLineDto> lineDtos = lines.stream()
                    .map(line -> SurplusReallocationLineDto.builder()
                            .cashDepositId(line.getCashDepositId())
                            .depositReference(line.getDepositReference())
                            .depositDate(line.getDepositDate())
                            .targetDate(line.getTargetDate())
                            .surplusTaken(line.getSurplusTaken())
                            .creditAllocated(line.getCreditAllocated())
                            .tontineAllocated(line.getTontineAllocated())
                            .newBalanceAllocated(line.getNewBalanceAllocated())
                            .build())
                    .toList();
            return SurplusReallocationDto.builder()
                    .commercialUsername(commercial)
                    .periodStart(periodStart)
                    .periodEnd(periodEnd)
                    .performedAt(performedAt)
                    .performedBy(performedBy)
                    .surplusBefore(surplusBefore)
                    .creditAllocated(creditAllocated)
                    .tontineAllocated(tontineAllocated)
                    .newBalanceAllocated(newBalanceAllocated)
                    .surplusRemaining(surplusRemaining)
                    .remainingBefore(remainingBefore)
                    .remainingAfter(remainingAfter)
                    .totalReallocated(totalReallocated)
                    .lines(lineDtos)
                    .build();
        }
    }
}
