package com.optimize.elykia.core.service.report;

import com.optimize.elykia.core.dto.report.CatchupCashAdjustmentDto;
import com.optimize.elykia.core.dto.report.CatchupCashAdjustmentLineDto;
import com.optimize.elykia.core.dto.report.CommercialYearlySummaryDto;
import com.optimize.elykia.core.dto.report.cockpit.CommercialCockpitDto;
import com.optimize.elykia.core.dto.report.cockpit.CommercialCockpitDto.Alert;
import com.optimize.elykia.core.dto.report.cockpit.CommercialCockpitDto.AlertType;
import com.optimize.elykia.core.dto.report.cockpit.CommercialCockpitDto.Cash;
import com.optimize.elykia.core.dto.report.cockpit.CommercialCockpitDto.Totals;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReconciliationLineDto;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReconciliationLineDto.ReconciliationStatus;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReportSummaryDto;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReportSummaryDto.DailyPoint;
import com.optimize.elykia.core.dto.report.cockpit.TeamYearlySummaryDto;
import com.optimize.elykia.core.config.CacheNames;
import com.optimize.elykia.core.entity.expense.Expense;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.ExpenseRepository;
import com.optimize.elykia.core.service.accounting.CashDepositService;
import com.optimize.elykia.core.service.accounting.CashSurplusReallocationService;
import com.optimize.elykia.core.util.CommercialReconciliationCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Rapport commerciaux : cockpit équipe, fiche commercial, portefeuille annuel équipe.
 * Le cockpit répond en une fois (rapports agrégés, rattrapages, dépenses) pour éviter
 * les appels multiples du navigateur.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommercialCockpitService {

    static final String SUPPLY_EXPENSE_TYPE = "Approvisionnement";
    private static final double EPSILON = 0.01;
    private static final int SERIES_DAYS = 7;

    private final DailyCommercialReportRepository reportRepository;
    private final CashDepositService cashDepositService;
    private final CashSurplusReallocationService surplusReallocationService;
    private final ExpenseRepository expenseRepository;
    private final CommercialReportMonthlyService monthlyService;

    /**
     * @param commercial  commercial à isoler (null : toute l'équipe)
     * @param compare     calcule aussi la période précédente de même durée
     * @param includeCash ajoute la synthèse caisse (toutes caisses)
     */
    public CommercialCockpitDto cockpit(LocalDate start, LocalDate end, String commercial, boolean compare,
            boolean includeCash) {
        List<CommercialReconciliationLineDto> all = lines(start, end, true);
        List<CommercialReconciliationLineDto> lines = StringUtils.hasText(commercial)
                ? all.stream().filter(line -> sameCommercial(line.commercialUsername(), commercial)).toList()
                : all;

        Totals previous = null;
        if (compare) {
            long days = ChronoUnit.DAYS.between(start, end) + 1;
            LocalDate previousEnd = start.minusDays(1);
            LocalDate previousStart = previousEnd.minusDays(days - 1);
            List<CommercialReconciliationLineDto> before = lines(previousStart, previousEnd, false);
            previous = totals(StringUtils.hasText(commercial)
                    ? before.stream().filter(line -> sameCommercial(line.commercialUsername(), commercial)).toList()
                    : before);
        }

        Cash cash = includeCash ? cash(start, end, all) : null;
        return new CommercialCockpitDto(start, end, totals(lines), previous, cash, sortLines(lines), alerts(lines));
    }

    /** Fiche d'un commercial : rapprochement, activité et 7 derniers jours. */
    public CommercialReportSummaryDto summary(String commercial, LocalDate start, LocalDate end) {
        List<DailyCommercialReport> reports = reportRepository
                .findAggregatedByDateBetweenAndCommercialUsername(commercial, start, end);
        surplusReallocationService.attachHistoricalRemaining(reports, start);
        DailyCommercialReport activity = reports.isEmpty() ? null : reports.get(0);

        CatchupCashAdjustmentLineDto adjustment = adjustmentsByCommercial(
                cashDepositService.catchupCashAdjustment(start, end)).get(key(commercial));
        CommercialReconciliationLineDto line = toLine(activity, commercial, adjustment);

        LocalDate seriesStart = end.minusDays(SERIES_DAYS - 1L);
        Map<LocalDate, DailyPoint> byDay = new LinkedHashMap<>();
        for (int i = 0; i < SERIES_DAYS; i++) {
            LocalDate day = seriesStart.plusDays(i);
            byDay.put(day, new DailyPoint(day, 0.0, 0.0));
        }
        for (DailyCommercialReport day : reportRepository
                .findByCommercialUsernameAndDateBetweenOrderByDateAsc(commercial, seriesStart, end)) {
            DailyPoint current = byDay.get(day.getDate());
            if (current != null) {
                byDay.put(day.getDate(), new DailyPoint(day.getDate(),
                        current.amountToDeposit() + safe(day.getTotalAmountToDeposit()),
                        current.deposited() + safe(day.getTotalAmountDeposited())));
            }
        }
        return new CommercialReportSummaryDto(start, end, line, activity, new ArrayList<>(byDay.values()));
    }

    /**
     * Portefeuille crédit annuel de l'équipe : somme des bilans par commercial.
     * Chaque bilan coûte plusieurs requêtes : le résultat est mis en cache quelques minutes
     * et l'écran ne le charge que lorsque la section devient visible.
     */
    @Cacheable(cacheNames = CacheNames.TEAM_YEARLY_SUMMARY, key = "#year")
    public TeamYearlySummaryDto teamYearlySummary(int year) {
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        List<String> commercials = reportRepository.findDistinctCommercialsBetween(
                yearStart, yearStart.plusYears(1).minusDays(1));
        double entrusted = 0.0;
        double deposited = 0.0;
        double atCommercial = 0.0;
        double atClient = 0.0;
        double debt = 0.0;
        double settled = 0.0;
        for (String commercial : commercials) {
            CommercialYearlySummaryDto summary = monthlyService.getYearlySummary(commercial, year);
            entrusted += summary.getEntrustedPortfolioAmount();
            deposited += summary.getTotalCreditDepositedAmount();
            atCommercial += summary.getRemainingAtCommercialAmount();
            atClient += summary.getRemainingAtClientAmount();
            debt += summary.getMerchandiseDebtGlobalAmount();
            settled += summary.getMerchandiseDebtSettledAmount();
        }
        return new TeamYearlySummaryDto(year, commercials.size(), entrusted, deposited, atCommercial, atClient,
                debt, settled);
    }

    /** Une ligne par commercial ayant un rapport ou un mouvement de rattrapage sur la période. */
    private List<CommercialReconciliationLineDto> lines(LocalDate start, LocalDate end, boolean withHistory) {
        List<DailyCommercialReport> reports = reportRepository.findAggregatedByDateBetween(start, end);
        if (withHistory) {
            surplusReallocationService.attachHistoricalRemaining(reports, start);
        }
        Map<String, CatchupCashAdjustmentLineDto> adjustments =
                adjustmentsByCommercial(cashDepositService.catchupCashAdjustment(start, end));

        Map<String, CommercialReconciliationLineDto> lines = new LinkedHashMap<>();
        for (DailyCommercialReport report : reports) {
            if (!StringUtils.hasText(report.getCommercialUsername())) {
                continue;
            }
            String key = key(report.getCommercialUsername());
            lines.put(key, toLine(report, report.getCommercialUsername(), adjustments.get(key)));
        }
        for (Map.Entry<String, CatchupCashAdjustmentLineDto> entry : adjustments.entrySet()) {
            if (!lines.containsKey(entry.getKey()) && StringUtils.hasText(entry.getValue().getCommercialUsername())) {
                lines.put(entry.getKey(), toLine(null, entry.getValue().getCommercialUsername(), entry.getValue()));
            }
        }
        return new ArrayList<>(lines.values());
    }

    private static CommercialReconciliationLineDto toLine(DailyCommercialReport report, String username,
            CatchupCashAdjustmentLineDto adjustment) {
        return CommercialReconciliationCalculator.line(report, username,
                adjustment != null ? adjustment.getCatchupEnteredAmount() : 0.0,
                adjustment != null ? adjustment.getCatchupReceivedAmount() : 0.0,
                adjustment != null ? adjustment.getDeferredAmount() : 0.0);
    }

    static Totals totals(List<CommercialReconciliationLineDto> lines) {
        double cashDue = 0.0;
        double toDeposit = 0.0;
        double entered = 0.0;
        double received = 0.0;
        double deposited = 0.0;
        double remaining = 0.0;
        double surplus = 0.0;
        double historical = 0.0;
        double credit = 0.0;
        double tontine = 0.0;
        double newBalance = 0.0;
        long operations = 0L;
        for (CommercialReconciliationLineDto line : lines) {
            cashDue += line.cashDue();
            toDeposit += line.amountToDeposit();
            entered += line.catchupEntered();
            received += line.cashReceived();
            deposited += line.deposited();
            remaining += line.remaining();
            surplus += line.surplus();
            historical += line.historicalRemaining();
            credit += line.creditToDeposit();
            tontine += line.tontineToDeposit();
            newBalance += line.newBalanceToDeposit();
            operations += line.operationsCount();
        }
        return new Totals(cashDue, toDeposit, entered, received, deposited, remaining, surplus, historical,
                CommercialReconciliationCalculator.depositRate(cashDue, remaining), credit, tontine, newBalance,
                operations, lines.size());
    }

    private Cash cash(LocalDate start, LocalDate end, List<CommercialReconciliationLineDto> all) {
        double received = all.stream().mapToDouble(CommercialReconciliationLineDto::cashReceived).sum();
        double withSupply = 0.0;
        double withoutSupply = 0.0;
        for (Expense expense : expenseRepository.findByExpenseDateBetween(start, end)) {
            double amount = expense.getAmount() != null ? expense.getAmount().doubleValue() : 0.0;
            withSupply += amount;
            if (!isSupply(expense)) {
                withoutSupply += amount;
            }
        }
        return new Cash(received, withSupply, withoutSupply, received - withoutSupply);
    }

    static boolean isSupply(Expense expense) {
        String name = expense.getExpenseType() != null ? expense.getExpenseType().getName() : null;
        return name != null && SUPPLY_EXPENSE_TYPE.equalsIgnoreCase(name.trim());
    }

    /** Points d'attention, le plus gros montant d'abord. */
    static List<Alert> alerts(List<CommercialReconciliationLineDto> lines) {
        List<Alert> alerts = new ArrayList<>();
        for (CommercialReconciliationLineDto line : lines) {
            boolean shortfall = line.remaining() > EPSILON || line.historicalRemaining() > EPSILON;
            double periodRemaining = line.remaining() - line.remainingCatchup();
            if (periodRemaining > EPSILON) {
                alerts.add(new Alert(AlertType.REMAINING, line.commercialUsername(), periodRemaining, false));
            }
            if (line.remainingCatchup() > EPSILON) {
                alerts.add(new Alert(AlertType.CATCHUP_NOT_DEPOSITED, line.commercialUsername(),
                        line.remainingCatchup(), false));
            }
            if (line.surplus() > EPSILON) {
                alerts.add(new Alert(AlertType.SURPLUS, line.commercialUsername(), line.surplus(), shortfall));
            }
            if (line.historicalRemaining() > EPSILON) {
                alerts.add(new Alert(AlertType.HISTORICAL_REMAINING, line.commercialUsername(),
                        line.historicalRemaining(), false));
            }
        }
        alerts.sort(Comparator.comparingDouble(Alert::amount).reversed());
        return alerts;
    }

    /** En retard d'abord (plus gros reste), puis surplus, à jour, inactifs ; puis par nom. */
    static List<CommercialReconciliationLineDto> sortLines(List<CommercialReconciliationLineDto> lines) {
        return lines.stream()
                .sorted(Comparator
                        .comparingInt((CommercialReconciliationLineDto line) -> rank(line.status()))
                        .thenComparing(Comparator.comparingDouble(CommercialReconciliationLineDto::remaining)
                                .reversed())
                        .thenComparing(Comparator.comparingDouble(CommercialReconciliationLineDto::surplus)
                                .reversed())
                        .thenComparing(CommercialReconciliationLineDto::commercialUsername,
                                Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
    }

    private static int rank(ReconciliationStatus status) {
        return switch (status) {
            case LATE -> 0;
            case SURPLUS -> 1;
            case UP_TO_DATE -> 2;
            case INACTIVE -> 3;
        };
    }

    private static Map<String, CatchupCashAdjustmentLineDto> adjustmentsByCommercial(
            CatchupCashAdjustmentDto adjustment) {
        Map<String, CatchupCashAdjustmentLineDto> map = new LinkedHashMap<>();
        if (adjustment == null || adjustment.getByCommercial() == null) {
            return map;
        }
        for (CatchupCashAdjustmentLineDto line : adjustment.getByCommercial()) {
            if (line == null || !StringUtils.hasText(line.getCommercialUsername())) {
                continue;
            }
            map.merge(key(line.getCommercialUsername()), line, (a, b) -> new CatchupCashAdjustmentLineDto(
                    a.getCommercialUsername(),
                    a.getCatchupReceivedAmount() + b.getCatchupReceivedAmount(),
                    a.getDeferredAmount() + b.getDeferredAmount(),
                    a.getCatchupEnteredAmount() + b.getCatchupEnteredAmount()));
        }
        return map;
    }

    private static boolean sameCommercial(String a, String b) {
        return a != null && b != null && a.trim().equalsIgnoreCase(b.trim());
    }

    private static String key(String username) {
        return username == null ? "" : username.trim().toUpperCase(Locale.ROOT);
    }

    private static double safe(Double value) {
        return value != null ? value : 0.0;
    }
}
