package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.dto.stock.CreditSoldAmountOnStockProjection;
import com.optimize.elykia.core.dto.stock.StockRecoverySummaryDto;
import com.optimize.elykia.core.service.sale.RattrapageCreditSupport;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemSoldValueHistoryRepository;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CommercialMonthlyStockRecoveryService {

    private final CommercialMonthlyStockItemSoldValueHistoryRepository soldValueHistoryRepository;
    private final CreditArticlesRepository creditArticlesRepository;
    private final CreditRepository creditRepository;

    public CommercialMonthlyStockRecoveryService(
            CommercialMonthlyStockItemSoldValueHistoryRepository soldValueHistoryRepository,
            CreditArticlesRepository creditArticlesRepository,
            CreditRepository creditRepository) {
        this.soldValueHistoryRepository = soldValueHistoryRepository;
        this.creditArticlesRepository = creditArticlesRepository;
        this.creditRepository = creditRepository;
    }

    public StockRecoverySummaryDto aggregate(CommercialMonthlyStock stock) {
        double remainingFromPhysicalStock = sumPhysicalStockRemainingValue(stock);
        double totalSoldValue = sumSoldValue(stock);
        double totalDueAmount = remainingFromPhysicalStock + totalSoldValue;

        List<Long> stockItemIds = extractStockItemIds(stock);
        if (stockItemIds.isEmpty()) {
            return buildSummary(totalDueAmount, remainingFromPhysicalStock, 0D, remainingFromPhysicalStock, 0D);
        }

        Map<Long, Double> soldOnStockByCredit = loadSoldValueByCredit(stock, stockItemIds);
        Set<Long> creditIds = new HashSet<>(soldOnStockByCredit.keySet());
        creditIds.addAll(creditArticlesRepository.findCreditIdsByStockItemIds(stockItemIds));

        if (creditIds.isEmpty()) {
            return buildSummary(totalDueAmount, remainingFromPhysicalStock, 0D, remainingFromPhysicalStock, 0D);
        }

        Map<Long, Credit> creditsById = creditRepository.findAllById(creditIds).stream()
                .collect(Collectors.toMap(Credit::getId, Function.identity()));

        List<CreditAttribution> attributions = new ArrayList<>();
        for (Long creditId : creditIds) {
            Credit credit = creditsById.get(creditId);
            if (credit == null) {
                continue;
            }

            double creditTotalAmount = safeAmount(credit.getTotalAmount());
            if (creditTotalAmount <= 0D) {
                continue;
            }

            if (RattrapageCreditSupport.isRattrapageReference(credit.getReference())
                    && soldOnStockByCredit.getOrDefault(creditId, 0D) <= 0D
                    && !isCreditExclusiveToStockItems(creditId, stockItemIds)) {
                continue;
            }

            double soldOnThisStock = resolveSoldAmountOnStock(
                    creditId, creditTotalAmount, stockItemIds, soldOnStockByCredit);
            if (soldOnThisStock <= 0D) {
                continue;
            }

            attributions.add(new CreditAttribution(credit, soldOnThisStock));
        }

        double soldAttributionCap = totalSoldValue;
        double totalAttributedSold = attributions.stream().mapToDouble(CreditAttribution::soldOnStock).sum();
        double attributionScale = totalAttributedSold > soldAttributionCap && soldAttributionCap > 0D
                ? soldAttributionCap / totalAttributedSold
                : 1D;

        double recoveredFromSales = 0D;
        for (CreditAttribution attribution : attributions) {
            double scaledSold = attribution.soldOnStock * attributionScale;
            Credit credit = attribution.credit;

            if (OperationType.CASH.equals(credit.getType())) {
                recoveredFromSales += scaledSold;
                continue;
            }

            double share = Math.min(1D, scaledSold / safeAmount(credit.getTotalAmount()));
            recoveredFromSales += safeAmount(credit.getTotalAmountPaid()) * share;
        }

        recoveredFromSales = Math.min(recoveredFromSales, totalDueAmount);
        double totalRemainingAmount = Math.max(0D, totalDueAmount - recoveredFromSales);
        double remainingFromCredits = Math.max(0D, totalRemainingAmount - remainingFromPhysicalStock);

        return buildSummary(
                totalDueAmount,
                remainingFromPhysicalStock,
                recoveredFromSales,
                totalRemainingAmount,
                remainingFromCredits);
    }

    private double resolveSoldAmountOnStock(
            Long creditId,
            double creditTotalAmount,
            List<Long> stockItemIds,
            Map<Long, Double> soldOnStockByCredit) {
        double soldFromSources = soldOnStockByCredit.getOrDefault(creditId, 0D);
        if (soldFromSources > 0D) {
            return soldFromSources;
        }

        if (isCreditExclusiveToStockItems(creditId, stockItemIds)) {
            return creditTotalAmount;
        }

        return 0D;
    }

    private boolean isCreditExclusiveToStockItems(Long creditId, List<Long> stockItemIds) {
        long onStock = creditArticlesRepository.countLinkedArticlesOnStockItems(creditId, stockItemIds);
        if (onStock == 0L) {
            return false;
        }
        long outsideStock = creditArticlesRepository.countLinkedArticlesOutsideStockItems(creditId, stockItemIds);
        return outsideStock == 0L;
    }

    /**
     * Attribution vendue par crédit : historique figé et lignes liées par stock_item_id uniquement.
     * Le rapprochement article/mois est volontairement exclu (sur-attribution en prod).
     */
    private Map<Long, Double> loadSoldValueByCredit(CommercialMonthlyStock stock, List<Long> stockItemIds) {
        Map<Long, Double> soldOnStockByCredit = new HashMap<>();
        mergeSoldValues(soldOnStockByCredit, soldValueHistoryRepository.sumSoldValueByCreditForStockItems(stockItemIds));
        mergeSoldValues(soldOnStockByCredit, creditArticlesRepository.sumSoldValueByCreditForStockItemIds(stockItemIds));
        return soldOnStockByCredit;
    }

    private static void mergeSoldValues(
            Map<Long, Double> target,
            List<CreditSoldAmountOnStockProjection> rows) {
        for (CreditSoldAmountOnStockProjection row : rows) {
            if (row.getCreditId() == null || row.getSoldValue() == null || row.getSoldValue() <= 0D) {
                continue;
            }
            target.merge(row.getCreditId(), row.getSoldValue(), Math::max);
        }
    }

    private static List<Long> extractStockItemIds(CommercialMonthlyStock stock) {
        if (stock.getItems() == null) {
            return List.of();
        }
        return stock.getItems().stream()
                .map(CommercialMonthlyStockItem::getId)
                .filter(Objects::nonNull)
                .toList();
    }

    private static double sumPhysicalStockRemainingValue(CommercialMonthlyStock stock) {
        if (stock.getItems() == null) {
            return 0D;
        }
        return stock.getItems().stream()
                .mapToDouble(item -> {
                    int remaining = item.getQuantityRemaining() != null ? item.getQuantityRemaining() : 0;
                    double unitPrice = item.getWeightedAverageUnitPrice() != null ? item.getWeightedAverageUnitPrice() : 0D;
                    return remaining * unitPrice;
                })
                .sum();
    }

    private static double sumSoldValue(CommercialMonthlyStock stock) {
        if (stock.getItems() == null) {
            return 0D;
        }
        return stock.getItems().stream()
                .mapToDouble(item -> item.getTotalSoldValue() != null ? item.getTotalSoldValue() : 0D)
                .sum();
    }

    private static StockRecoverySummaryDto buildSummary(
            double totalDueAmount,
            double remainingFromPhysicalStock,
            double recoveredFromSales,
            double totalRemainingAmount,
            double remainingFromCredits) {
        double totalRecoveredAmount = recoveredFromSales;
        double recoveryRatePercent = totalDueAmount > 0D
                ? Math.min(100D, (totalRecoveredAmount / totalDueAmount) * 100D)
                : 0D;

        return StockRecoverySummaryDto.builder()
                .totalDueAmount(round(totalDueAmount))
                .totalRecoveredAmount(round(totalRecoveredAmount))
                .totalRemainingAmount(round(totalRemainingAmount))
                .recoveryRatePercent(round(recoveryRatePercent))
                .remainingFromPhysicalStock(round(remainingFromPhysicalStock))
                .recoveredFromSales(round(recoveredFromSales))
                .remainingFromCredits(round(remainingFromCredits))
                .build();
    }

    private static double safeAmount(Double amount) {
        return amount != null ? amount : 0D;
    }

    private static double round(double value) {
        return Math.ceil(value);
    }

    private record CreditAttribution(Credit credit, double soldOnStock) {
    }
}
