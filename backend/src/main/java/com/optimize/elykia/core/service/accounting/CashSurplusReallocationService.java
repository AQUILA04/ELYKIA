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

    public SurplusReallocationDto reallocate(String commercialUsername, LocalDate startDate, LocalDate endDate) {
        User currentUser = userService.getCurrentUser();
        assertCanReallocate(currentUser);

        if (!StringUtils.hasText(commercialUsername) || startDate == null || endDate == null) {
            throw new RuntimeException("Commercial et période sont obligatoires.");
        }
        if (endDate.isBefore(startDate)) {
            throw new RuntimeException("La date de fin doit être postérieure ou égale à la date de début.");
        }

        String commercial = commercialUsername.trim();
        List<DailyCommercialReport> periodReports = dailyReportRepository
                .findByCommercialUsernameAndDateBetweenOrderByDateAsc(commercial, startDate, endDate);
        if (periodReports.isEmpty()) {
            throw new RuntimeException("Aucun rapport journalier pour ce commercial sur la période.");
        }

        PeriodGaps gaps = computePeriodGaps(periodReports);
        if (gaps.surplusBefore <= 0.01) {
            throw new RuntimeException("Aucun surplus non catégorisé à équilibrer sur cette période.");
        }
        if (gaps.remainingBefore <= 0.01) {
            throw new RuntimeException("Aucun manquant crédit, tontine ou solde à combler sur cette période.");
        }

        List<CashDeposit> surplusDeposits = cashDepositRepository.findSurplusDepositsForPeriod(commercial, startDate,
                endDate);
        if (surplusDeposits.isEmpty()) {
            throw new RuntimeException("Aucun versement avec surplus trouvé sur cette période.");
        }

        double creditGap = gaps.creditGap;
        double tontineGap = gaps.tontineGap;
        double newBalanceGap = gaps.newBalanceGap;
        double creditAllocated = 0.0;
        double tontineAllocated = 0.0;
        double newBalanceAllocated = 0.0;

        Map<Long, DailyCommercialReport> reportsById = new LinkedHashMap<>();
        Set<Long> remittanceIds = new HashSet<>();
        List<CashSurplusReallocationLine> lines = new ArrayList<>();

        for (CashDeposit deposit : surplusDeposits) {
            double available = safe(deposit.getSurplusAmount());
            if (available <= 0.01) {
                continue;
            }
            double need = creditGap + tontineGap + newBalanceGap;
            if (need <= 0.01) {
                break;
            }

            double toCredit = Math.min(available, creditGap);
            available -= toCredit;
            creditGap -= toCredit;

            double toTontine = Math.min(available, tontineGap);
            available -= toTontine;
            tontineGap -= toTontine;

            double toNewBalance = Math.min(available, newBalanceGap);
            available -= toNewBalance;
            newBalanceGap -= toNewBalance;

            double taken = toCredit + toTontine + toNewBalance;
            if (taken <= 0.01) {
                continue;
            }

            deposit.setCreditAmount(safe(deposit.getCreditAmount()) + toCredit);
            deposit.setTontineAmount(safe(deposit.getTontineAmount()) + toTontine);
            deposit.setNewBalanceAmount(safe(deposit.getNewBalanceAmount()) + toNewBalance);
            deposit.setSurplusAmount(safe(deposit.getSurplusAmount()) - taken);
            CashDepositCategoryCalculator.validateCategorySplit(
                    deposit.getAmount(),
                    deposit.getCreditAmount(),
                    deposit.getTontineAmount(),
                    deposit.getNewBalanceAmount(),
                    deposit.getSurplusAmount());
            cashDepositRepository.save(deposit);

            DailyCommercialReport report = resolveReport(deposit, reportsById);
            report.setTotalCreditAmountDeposited(safe(report.getTotalCreditAmountDeposited()) + toCredit);
            report.setTotalTontineAmountDeposited(safe(report.getTotalTontineAmountDeposited()) + toTontine);
            report.setTotalNewBalanceAmountDeposited(safe(report.getTotalNewBalanceAmountDeposited()) + toNewBalance);
            report.setTotalSurplusAmountDeposited(Math.max(0.0,
                    safe(report.getTotalSurplusAmountDeposited()) - taken));
            reportsById.put(report.getId() != null ? report.getId() : -deposit.getId(), report);

            if (deposit.getRemittance() != null && deposit.getRemittance().getId() != null) {
                remittanceIds.add(deposit.getRemittance().getId());
            }

            CashSurplusReallocationLine line = new CashSurplusReallocationLine();
            line.setCashDepositId(deposit.getId());
            line.setDepositReference(deposit.getReference());
            line.setDepositDate(deposit.getDate());
            line.setSurplusTaken(taken);
            line.setCreditAllocated(toCredit);
            line.setTontineAllocated(toTontine);
            line.setNewBalanceAllocated(toNewBalance);
            lines.add(line);

            creditAllocated += toCredit;
            tontineAllocated += toTontine;
            newBalanceAllocated += toNewBalance;
        }

        double totalReallocated = creditAllocated + tontineAllocated + newBalanceAllocated;
        if (totalReallocated <= 0.01) {
            throw new RuntimeException("Aucun montant n'a pu être réaffecté.");
        }

        for (DailyCommercialReport report : reportsById.values()) {
            reportPersistence.save(report);
        }
        for (Long remittanceId : remittanceIds) {
            refreshRemittanceCategories(remittanceId);
        }

        LocalDateTime performedAt = LocalDateTime.now();
        CashSurplusReallocation reallocation = new CashSurplusReallocation();
        reallocation.setCommercialUsername(commercial);
        reallocation.setPeriodStart(startDate);
        reallocation.setPeriodEnd(endDate);
        reallocation.setPerformedAt(performedAt);
        reallocation.setPerformedBy(currentUser.getUsername());
        reallocation.setSurplusBefore(gaps.surplusBefore);
        reallocation.setCreditAllocated(creditAllocated);
        reallocation.setTontineAllocated(tontineAllocated);
        reallocation.setNewBalanceAllocated(newBalanceAllocated);
        reallocation.setSurplusRemaining(Math.max(0.0, gaps.surplusBefore - totalReallocated));
        reallocation.setRemainingBefore(gaps.remainingBefore);
        reallocation.setRemainingAfter(Math.max(0.0, gaps.remainingBefore - totalReallocated));
        reallocation.setTotalReallocated(totalReallocated);
        for (CashSurplusReallocationLine line : lines) {
            reallocation.addLine(line);
        }
        CashSurplusReallocation saved = reallocationRepository.save(reallocation);

        String refs = lines.stream()
                .map(l -> l.getDepositReference() != null ? l.getDepositReference() : String.valueOf(l.getCashDepositId()))
                .reduce((a, b) -> a + ", " + b)
                .orElse("-");
        String description = String.format(Locale.FRANCE,
                "Équilibrage par %s sur %s – %s. Surplus avant: %.0f. Réaffecté: %.0f (crédit %.0f, tontine %.0f, solde %.0f). Surplus restant: %.0f. Reste après: %.0f. Versements: %s",
                currentUser.getUsername(),
                startDate.format(DAY_FMT),
                endDate.format(DAY_FMT),
                gaps.surplusBefore,
                totalReallocated,
                creditAllocated,
                tontineAllocated,
                newBalanceAllocated,
                saved.getSurplusRemaining(),
                saved.getRemainingAfter(),
                refs);

        dailyOperationService.logOperationInCurrentTransaction(
                commercial,
                OperationType.SURPLUS_REALLOCATION,
                totalReallocated,
                commercial + " · " + startDate.format(DAY_FMT) + " – " + endDate.format(DAY_FMT),
                description,
                0.0,
                0.0,
                performedAt.toLocalDate());

        return toDto(saved);
    }

    private DailyCommercialReport resolveReport(CashDeposit deposit, Map<Long, DailyCommercialReport> cache) {
        if (deposit.getDailyReport() != null) {
            DailyCommercialReport report = deposit.getDailyReport();
            if (report.getId() != null) {
                cache.putIfAbsent(report.getId(), report);
                return cache.get(report.getId());
            }
            return report;
        }
        return dailyReportRepository
                .findByDateAndCommercialUsername(deposit.getDate(), deposit.getCommercialUsername())
                .orElseThrow(() -> new IllegalStateException(
                        "Rapport journalier introuvable pour le versement " + deposit.getReference()));
    }

    private void refreshRemittanceCategories(Long remittanceId) {
        CashPeriodRemittance remittance = remittanceRepository.findById(remittanceId)
                .orElse(null);
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

    private static PeriodGaps computePeriodGaps(List<DailyCommercialReport> reports) {
        double advances = 0;
        double collections = 0;
        double reliquatGen = 0;
        double reliquatUsed = 0;
        double tontineCollections = 0;
        double newAccounts = 0;
        double creditDeposited = 0;
        double tontineDeposited = 0;
        double newBalanceDeposited = 0;
        double surplus = 0;
        for (DailyCommercialReport report : reports) {
            advances += safe(report.getTotalAdvancesAmount());
            collections += safe(report.getCollectionsAmount());
            reliquatGen += safe(report.getTotalReliquatGeneratedAmount());
            reliquatUsed += safe(report.getTotalReliquatUsedAmount());
            tontineCollections += safe(report.getTontineCollectionsAmount());
            newAccounts += safe(report.getNewAccountsBalance());
            creditDeposited += safe(report.getTotalCreditAmountDeposited());
            tontineDeposited += safe(report.getTotalTontineAmountDeposited());
            newBalanceDeposited += safe(report.getTotalNewBalanceAmountDeposited());
            surplus += safe(report.getTotalSurplusAmountDeposited());
        }
        double creditToDeposit = advances + collections + reliquatGen - reliquatUsed;
        double creditGap = CashDepositCategoryCalculator.periodRemainingCredit(creditToDeposit, creditDeposited);
        double tontineGap = CashDepositCategoryCalculator.periodRemainingTontine(tontineCollections, tontineDeposited);
        double newBalanceGap = CashDepositCategoryCalculator.periodRemainingNewBalance(newAccounts, newBalanceDeposited);
        return new PeriodGaps(surplus, creditGap, tontineGap, newBalanceGap,
                creditGap + tontineGap + newBalanceGap);
    }

    private void assertCanReallocate(User currentUser) {
        if (currentUser == null
                || (!currentUser.is(UserProfilConstant.GESTIONNAIRE)
                        && !currentUser.is(UserProfilConstant.SECRETARY)
                        && !currentUser.is(UserProfilConstant.ADMIN))) {
            throw new RuntimeException("Seul le gestionnaire ou la secrétaire peut équilibrer un surplus.");
        }
    }

    private SurplusReallocationDto toDto(CashSurplusReallocation entity) {
        List<SurplusReallocationLineDto> lines = entity.getLines() == null ? List.of()
                : entity.getLines().stream()
                        .map(line -> SurplusReallocationLineDto.builder()
                                .cashDepositId(line.getCashDepositId())
                                .depositReference(line.getDepositReference())
                                .depositDate(line.getDepositDate())
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

    private record PeriodGaps(double surplusBefore, double creditGap, double tontineGap, double newBalanceGap,
            double remainingBefore) {
    }
}
