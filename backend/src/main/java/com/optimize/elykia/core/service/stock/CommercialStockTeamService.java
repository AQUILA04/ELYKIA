package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.dto.stock.StockRecoverySummaryDto;
import com.optimize.elykia.core.dto.stock.team.StockTeamLineDto;
import com.optimize.elykia.core.dto.stock.team.StockTeamOverviewDto;
import com.optimize.elykia.core.dto.stock.team.StockToSettleDto;
import com.optimize.elykia.core.entity.debt.DebtDocument;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.DebtStatus;
import com.optimize.elykia.core.enumaration.DebtType;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.DebtDocumentRepository;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Vue équipe du stock commercial (nouvel écran) : une ligne par commercial, sans charger
 * les stocks un par un. Requêtes : stocks du mois avec articles (1), dettes du mois (1),
 * puis le recouvrement de chaque stock (service existant, mêmes chiffres que l'écran stock).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommercialStockTeamService {

    private static final double EPSILON = 0.01;

    private final CommercialMonthlyStockRepository stockRepository;
    private final DebtDocumentRepository debtRepository;
    private final CommercialMonthlyStockRecoveryService recoveryService;

    /**
     * @param onlyCollector commercial à isoler (null : toute l'équipe)
     */
    public StockTeamOverviewDto overview(int year, int month, String onlyCollector, LocalDate today) {
        List<CommercialMonthlyStock> stocks = stockRepository.findWithItemsByMonthAndYear(month, year).stream()
                .filter(stock -> !StringUtils.hasText(onlyCollector)
                        || onlyCollector.equalsIgnoreCase(stock.getCollector()))
                .toList();
        boolean closed = isPastMonth(year, month, today);

        Map<Long, DebtDocument> debtsByStock = stocks.isEmpty() ? Map.of() : debtRepository
                .findByMonthlyStockIdInAndDebtTypeAndStatusNot(
                        stocks.stream().map(CommercialMonthlyStock::getId).toList(),
                        DebtType.MERCHANDISE, DebtStatus.CANCELLED)
                .stream()
                .filter(debt -> debt.getMonthlyStock() != null)
                .collect(Collectors.toMap(debt -> debt.getMonthlyStock().getId(), Function.identity(), (a, b) -> a));

        List<StockTeamLineDto> lines = new ArrayList<>();
        for (CommercialMonthlyStock stock : stocks) {
            lines.add(line(stock, debtsByStock.get(stock.getId()), closed));
        }
        lines.sort(Comparator.comparingDouble(StockTeamLineDto::leftToRecover).reversed()
                .thenComparing(StockTeamLineDto::collector, Comparator.nullsLast(String::compareToIgnoreCase)));
        return new StockTeamOverviewDto(year, month, closed, totals(lines), lines);
    }

    /** Mois clôturés avec un reste sans dette, le plus ancien d'abord. */
    public List<StockToSettleDto> toSettle(String onlyCollector, LocalDate today) {
        return stockRepository.findClosedWithRemainingAndNoDebt(today.getMonthValue(), today.getYear()).stream()
                .filter(stock -> !StringUtils.hasText(onlyCollector)
                        || onlyCollector.equalsIgnoreCase(stock.getCollector()))
                .map(CommercialStockTeamService::toSettleLine)
                .sorted(Comparator.comparingInt(StockToSettleDto::year)
                        .thenComparingInt(StockToSettleDto::month)
                        .thenComparing(StockToSettleDto::collector, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
    }

    StockTeamLineDto line(CommercialMonthlyStock stock, DebtDocument debt, boolean closed) {
        StockRecoverySummaryDto summary = recoveryService.aggregate(stock);
        CommercialMonthlyStockService.RecoveryTotals recovery =
                CommercialMonthlyStockService.recoveryTotals(summary, debt);

        long taken = 0;
        long sold = 0;
        long returned = 0;
        long remaining = 0;
        double takenValue = 0;
        double returnedValue = 0;
        int itemsWithRemaining = 0;
        List<CommercialMonthlyStockItem> items = stock.getItems() != null ? List.copyOf(stock.getItems()) : List.of();
        for (CommercialMonthlyStockItem item : items) {
            int itemRemaining = qty(item.getQuantityRemaining());
            double unit = item.getWeightedAverageUnitPrice() != null ? item.getWeightedAverageUnitPrice() : 0D;
            taken += qty(item.getQuantityTaken());
            sold += qty(item.getQuantitySold());
            returned += qty(item.getQuantityReturned());
            remaining += itemRemaining;
            takenValue += qty(item.getQuantityTaken()) * unit;
            returnedValue += qty(item.getQuantityReturned()) * unit;
            if (itemRemaining > 0) {
                itemsWithRemaining++;
            }
        }
        boolean toSettle = closed && remaining > 0 && debt == null;
        return new StockTeamLineDto(
                stock.getId(),
                stock.getCollector(),
                items.size(),
                itemsWithRemaining,
                taken,
                sold,
                returned,
                remaining,
                Math.ceil(takenValue),
                summary.getTotalDueAmount() - summary.getRemainingFromPhysicalStock() - summary.getDebtValueAmount(),
                Math.ceil(returnedValue),
                summary.getRemainingFromPhysicalStock(),
                summary.getDebtValueAmount(),
                summary.getTotalDueAmount(),
                Math.ceil(recovery.recovered()),
                Math.ceil(recovery.remaining()),
                Math.ceil(recovery.ratePercent()),
                taken > 0 ? Math.min(100D, (sold * 100D) / taken) : 0D,
                debt != null ? debt.getId() : null,
                debt != null && debt.getStatus() != null ? debt.getStatus().name() : null,
                debt != null ? Math.ceil(recovery.debtRemaining()) : 0D,
                toSettle);
    }

    static StockTeamOverviewDto.Totals totals(List<StockTeamLineDto> lines) {
        long taken = 0;
        long sold = 0;
        long returned = 0;
        long remaining = 0;
        double takenValue = 0;
        double soldValue = 0;
        double returnedValue = 0;
        double remainingValue = 0;
        double debtValue = 0;
        double due = 0;
        double recovered = 0;
        double left = 0;
        for (StockTeamLineDto line : lines) {
            taken += line.quantityTaken();
            sold += line.quantitySold();
            returned += line.quantityReturned();
            remaining += line.quantityRemaining();
            takenValue += line.takenValue();
            soldValue += line.soldValue();
            returnedValue += line.returnedValue();
            remainingValue += line.remainingValue();
            debtValue += line.debtValue();
            due += line.dueValue();
            recovered += line.recoveredValue();
            left += line.leftToRecover();
        }
        double recoveryRate = due > EPSILON ? Math.min(100D, recovered * 100D / due) : 0D;
        double soldRate = taken > 0 ? Math.min(100D, sold * 100D / taken) : 0D;
        return new StockTeamOverviewDto.Totals(taken, sold, returned, remaining, takenValue, soldValue,
                returnedValue, remainingValue, debtValue, due, recovered, left, recoveryRate, soldRate, lines.size());
    }

    /** Montant d'une dette éventuelle : même arrondi que la création de la dette marchandise. */
    static StockToSettleDto toSettleLine(CommercialMonthlyStock stock) {
        int itemsWithRemaining = 0;
        long quantity = 0;
        double value = 0;
        for (CommercialMonthlyStockItem item : stock.getItems()) {
            int remaining = qty(item.getQuantityRemaining());
            if (remaining <= 0) {
                continue;
            }
            double unit = item.getWeightedAverageUnitPrice() != null
                    ? Math.ceil(item.getWeightedAverageUnitPrice()) : 0D;
            itemsWithRemaining++;
            quantity += remaining;
            value += Math.ceil(remaining * unit);
        }
        return new StockToSettleDto(stock.getId(), stock.getCollector(), stock.getYear(), stock.getMonth(),
                itemsWithRemaining, quantity, value);
    }

    static boolean isPastMonth(int year, int month, LocalDate today) {
        return year < today.getYear() || (year == today.getYear() && month < today.getMonthValue());
    }

    private static int qty(Integer value) {
        return value != null ? value : 0;
    }
}
