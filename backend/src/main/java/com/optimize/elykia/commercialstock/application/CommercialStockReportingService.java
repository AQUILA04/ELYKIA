package com.optimize.elykia.commercialstock.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.commercialstock.api.CommercialStockPeriodRowView;
import com.optimize.elykia.commercialstock.api.CommercialStockReportingFacade;
import com.optimize.elykia.commercialstock.api.CommercialStockTeamRowView;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.domain.CommercialStockLedgerEntry;
import com.optimize.elykia.commercialstock.domain.CommercialStockPeriodSnapshot;
import com.optimize.elykia.commercialstock.domain.SnapshotPeriodGrain;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockLedgerEntryRepository;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockPeriodSnapshotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Moteur de reporting périodique : reconstruit pour toute fenêtre [startDate, endDate] l'ouverture,
 * les flux par nature et la clôture à partir du ledger (par {@code accounting_date}), et matérialise
 * les arrêtés mensuels dans {@code commercial_stock_period_snapshot}.
 */
@Service
@Transactional(readOnly = true)
public class CommercialStockReportingService implements CommercialStockReportingFacade {

    private final CommercialStockLedgerEntryRepository ledgerRepository;
    private final CommercialStockPeriodSnapshotRepository snapshotRepository;

    public CommercialStockReportingService(CommercialStockLedgerEntryRepository ledgerRepository,
                                           CommercialStockPeriodSnapshotRepository snapshotRepository) {
        this.ledgerRepository = ledgerRepository;
        this.snapshotRepository = snapshotRepository;
    }

    @Override
    public List<CommercialStockPeriodRowView> periodReport(LocalDate startDate, LocalDate endDate, String collector,
                                                           StockActivityType activityType) {
        validateWindow(startDate, endDate);
        Map<Key, Accumulator> map = new LinkedHashMap<>();
        for (CommercialStockLedgerEntry entry : ledgerRepository.findAllUpTo(collector, activityType, endDate)) {
            Key key = new Key(entry.getCollector(), entry.getArticleId(), entry.getActivityType());
            map.computeIfAbsent(key, ignored -> new Accumulator()).accept(entry, startDate);
        }
        List<CommercialStockPeriodRowView> rows = new ArrayList<>();
        map.forEach((key, acc) -> {
            if (acc.isNonEmpty()) {
                rows.add(acc.toRow(key));
            }
        });
        return rows;
    }

    @Override
    public List<CommercialStockTeamRowView> teamOverview(LocalDate startDate, LocalDate endDate, String collector,
                                                         StockActivityType activityType) {
        Map<TeamKey, TeamAcc> teams = new LinkedHashMap<>();
        for (CommercialStockPeriodRowView row : periodReport(startDate, endDate, collector, activityType)) {
            TeamKey key = new TeamKey(row.collector(), row.activityType());
            teams.computeIfAbsent(key, ignored -> new TeamAcc()).add(row);
        }
        List<CommercialStockTeamRowView> result = new ArrayList<>();
        teams.forEach((key, acc) -> result.add(new CommercialStockTeamRowView(key.collector(), key.activityType(),
                acc.opening, acc.in, acc.sold, acc.returned, acc.transferNet, acc.debt, acc.closing,
                acc.soldValue, acc.margin)));
        return result;
    }

    @Override
    @Transactional
    public int computeMonthlySnapshots(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<CommercialStockPeriodRowView> rows = periodReport(start, end, null, null);
        for (CommercialStockPeriodRowView row : rows) {
            CommercialStockPeriodSnapshot snapshot = snapshotRepository
                    .findByCollectorAndArticleIdAndActivityTypeAndPeriodGrainAndPeriodYearAndPeriodMonth(
                            row.collector(), row.articleId(), row.activityType(), SnapshotPeriodGrain.MONTH, year, month)
                    .orElseGet(() -> {
                        CommercialStockPeriodSnapshot created = new CommercialStockPeriodSnapshot();
                        created.setCollector(row.collector());
                        created.setArticleId(row.articleId());
                        created.setActivityType(row.activityType());
                        created.setPeriodGrain(SnapshotPeriodGrain.MONTH);
                        created.setPeriodYear(year);
                        created.setPeriodMonth(month);
                        created.setClosedAt(now);
                        return created;
                    });
            if (snapshot.getId() != null) {
                snapshot.setRestatedAt(now);
            }
            snapshot.setPeriodStart(start);
            snapshot.setPeriodEnd(end);
            snapshot.setOpeningQuantity(row.openingQuantity());
            snapshot.setInQuantity(row.inQuantity());
            snapshot.setSoldQuantity(row.soldQuantity());
            snapshot.setReturnedQuantity(row.returnedQuantity());
            snapshot.setTransferNetQuantity(row.transferNetQuantity());
            snapshot.setDebtQuantity(row.debtQuantity());
            snapshot.setAdjustmentNetQuantity(row.adjustmentNetQuantity());
            snapshot.setClosingQuantity(row.closingQuantity());
            snapshot.setSoldValue(row.soldValue());
            snapshot.setPurchaseCostOfSold(row.purchaseCostOfSold());
            snapshot.setRealizedMargin(row.realizedMargin());
            snapshotRepository.save(snapshot);
        }
        return rows.size();
    }

    private static void validateWindow(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            throw new CustomValidationException("La plage de dates [startDate, endDate] est invalide.");
        }
    }

    private record Key(String collector, Long articleId, StockActivityType activityType) {
    }

    private record TeamKey(String collector, StockActivityType activityType) {
    }

    private static final class Accumulator {
        int opening;
        int in;
        int sold;
        int returned;
        int transferNet;
        int debt;
        int adjustmentNet;
        double soldValue;
        double purchaseOfSold;
        boolean backdated;

        void accept(CommercialStockLedgerEntry entry, LocalDate startDate) {
            int delta = entry.getDeltaQuantity();
            if (entry.getAccountingDate().isBefore(startDate)) {
                opening += delta;
                return;
            }
            if (entry.isBackdated()) {
                backdated = true;
            }
            switch (entry.getMovementType()) {
                case STOCK_IN -> in += delta;
                case CREDIT_SALE, TONTINE_DELIVERY -> {
                    sold += -delta;
                    soldValue += val(entry.getTotalSaleValue());
                    purchaseOfSold += val(entry.getTotalPurchaseValue());
                }
                case SALE_CANCELLATION -> {
                    sold -= delta;
                    soldValue -= val(entry.getTotalSaleValue());
                    purchaseOfSold -= val(entry.getTotalPurchaseValue());
                }
                case RETURN -> returned += -delta;
                case ACTIVITY_TRANSFER_IN, ACTIVITY_TRANSFER_OUT -> transferNet += delta;
                case DEBT_WRITE_OFF -> debt += -delta;
                case DEBT_REVERSAL -> debt -= delta;
                case ADJUSTMENT -> adjustmentNet += delta;
                case PRICE_REVALUATION -> { }
            }
        }

        boolean isNonEmpty() {
            return opening != 0 || in != 0 || sold != 0 || returned != 0 || transferNet != 0 || debt != 0
                    || adjustmentNet != 0;
        }

        CommercialStockPeriodRowView toRow(Key key) {
            int closing = opening + in - sold - returned + transferNet - debt + adjustmentNet;
            return new CommercialStockPeriodRowView(key.collector(), key.articleId(), key.activityType(), opening, in,
                    sold, returned, transferNet, debt, adjustmentNet, closing, soldValue, purchaseOfSold,
                    soldValue - purchaseOfSold, backdated);
        }

        private static double val(Double value) {
            return value != null ? value : 0d;
        }
    }

    private static final class TeamAcc {
        int opening;
        int in;
        int sold;
        int returned;
        int transferNet;
        int debt;
        int closing;
        double soldValue;
        double margin;

        void add(CommercialStockPeriodRowView row) {
            opening += row.openingQuantity();
            in += row.inQuantity();
            sold += row.soldQuantity();
            returned += row.returnedQuantity();
            transferNet += row.transferNetQuantity();
            debt += row.debtQuantity();
            closing += row.closingQuantity();
            soldValue += row.soldValue();
            margin += row.realizedMargin();
        }
    }
}
