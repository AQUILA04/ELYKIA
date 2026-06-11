package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MonthlyReportAggregationService {

    private final EntityManager entityManager;
    private final DailyCommercialReportRepository dailyCommercialReportRepository;
    private final CreditRepository creditRepository;
    private final CommercialStockMovementRepository commercialStockMovementRepository;
    private final MonthlyReportMarginCalculator marginCalculator;

    public Map<String, Object> aggregateGeneral(int year, int month) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("year", year);
        root.put("month", month);
        root.put("startDate", startDate.toString());
        root.put("endDate", endDate.toString());

        Map<String, Object> salesSummary = buildSalesSummary(startDate, endDate);
        root.put("salesSummary", salesSummary);
        root.put("stockEntries", aggregateStockEntries(startDate, endDate));
        root.put("recoveries", aggregateRecoveries(startDate, endDate));
        root.put("tontine", aggregateTontine(startDate, endDate));
        root.put("dailySummary", aggregateDailySummary(startDate, endDate));
        return root;
    }

    public Map<String, Object> aggregateCommercial(int year, int month, String commercialUsername) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        List<DailyCommercialReport> daily = dailyCommercialReportRepository
                .findByCommercialUsernameAndDateBetweenOrderByDateAsc(commercialUsername, startDate, endDate);

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("year", year);
        root.put("month", month);
        root.put("commercialUsername", commercialUsername);
        root.put("dailySummary", daily);

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        List<CommercialStockMovement> movements = commercialStockMovementRepository
                .findTimelineByCollector(commercialUsername, startDateTime, endDateTime);
        root.put("movements", movements);
        return root;
    }

    public List<String> listActiveCommercials(int year, int month) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        Set<String> commercials = new TreeSet<>();
        dailyCommercialReportRepository.findAggregatedByDateBetween(startDate, endDate)
                .forEach(r -> commercials.add(r.getCommercialUsername()));
        commercials.addAll(creditRepository.findDistinctCollectors());
        commercials.removeIf(Objects::isNull);
        return new ArrayList<>(commercials);
    }

    private Map<String, Object> buildSalesSummary(LocalDate startDate, LocalDate endDate) {
        Object[] credit = (Object[]) entityManager.createNativeQuery("""
                SELECT
                    COALESCE(COUNT(id), 0),
                    COALESCE(SUM(total_amount), 0),
                    COALESCE(SUM(total_purchase), 0),
                    COALESCE(SUM(profit_margin), 0)
                FROM credit
                WHERE accounting_date BETWEEN :startDate AND :endDate
                  AND type = 'CREDIT'
                """)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult();

        Object[] cash = (Object[]) entityManager.createNativeQuery("""
                SELECT
                    COALESCE(COUNT(id), 0),
                    COALESCE(SUM(total_amount), 0),
                    COALESCE(SUM(total_purchase), 0),
                    COALESCE(SUM(profit_margin), 0)
                FROM credit
                WHERE accounting_date BETWEEN :startDate AND :endDate
                  AND type = 'CASH'
                """)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult();

        Object[] tontine = (Object[]) entityManager.createNativeQuery("""
                SELECT
                    COALESCE(COUNT(id), 0),
                    COALESCE(SUM(total_amount), 0),
                    COALESCE(SUM(total_purchase), 0),
                    COALESCE(SUM(profit_margin), 0)
                FROM credit
                WHERE accounting_date BETWEEN :startDate AND :endDate
                  AND type = 'TONTINE'
                """)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult();

        double totalRevenue = toDouble(credit[1]) + toDouble(cash[1]) + toDouble(tontine[1]);
        double totalPurchase = toDouble(credit[2]) + toDouble(cash[2]) + toDouble(tontine[2]);
        double totalMargin = toDouble(credit[3]) + toDouble(cash[3]) + toDouble(tontine[3]);

        Map<String, Object> sales = new LinkedHashMap<>();
        sales.put("credit", toSummaryMap(credit));
        sales.put("cash", toSummaryMap(cash));
        sales.put("tontine", toSummaryMap(tontine));
        sales.put("totalRevenue", totalRevenue);
        sales.put("totalPurchase", totalPurchase);
        sales.put("totalMargin", totalMargin);
        sales.put("totalMarginRate", marginCalculator.marginRate(totalMargin, totalPurchase));
        sales.put("ordersExcluded", true);
        return sales;
    }

    private List<Map<String, Object>> aggregateStockEntries(LocalDate startDate, LocalDate endDate) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT
                    a.id,
                    CONCAT(a.type, ': ', a.marque, ' ', a.model) AS article_name,
                    COALESCE(SUM(ah.operation_quantity), 0) AS qty,
                    COALESCE(AVG(COALESCE(sri.unit_price, a.purchase_price)), 0) AS unit_purchase_price,
                    COALESCE(MAX(a.credit_sale_price), 0) AS unit_credit_price
                FROM article_history ah
                JOIN articles a ON a.id = ah.articles_id
                LEFT JOIN stock_reception_item sri ON sri.article_id = a.id
                LEFT JOIN stock_reception sr ON sr.id = sri.stock_reception_id
                      AND sr.reception_date = ah.operation_date
                WHERE ah.operation_type = 'ENTREE'
                  AND ah.operation_date BETWEEN :startDate AND :endDate
                GROUP BY a.id, article_name
                ORDER BY article_name
                """)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getResultList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            int qty = toInt(row[2]);
            double buy = toDouble(row[3]);
            double sale = toDouble(row[4]);
            double margin = marginCalculator.lineMargin(sale, buy, qty);
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("articleId", row[0]);
            line.put("articleName", row[1]);
            line.put("quantity", qty);
            line.put("unitPurchasePrice", buy);
            line.put("unitCreditSalePrice", sale);
            line.put("estimatedMargin", margin);
            line.put("estimatedMarginRate", marginCalculator.marginRate(margin, buy * qty));
            result.add(line);
        }
        return result;
    }

    private Map<String, Object> aggregateRecoveries(LocalDate startDate, LocalDate endDate) {
        Object[] totals = (Object[]) entityManager.createNativeQuery("""
                SELECT COALESCE(COUNT(id), 0), COALESCE(SUM(amount), 0)
                FROM credit_timeline
                WHERE date_reg BETWEEN :startDateTime AND :endDateTime
                """)
                .setParameter("startDateTime", startDate.atStartOfDay())
                .setParameter("endDateTime", endDate.atTime(23, 59, 59))
                .getSingleResult();

        Object[] rm = (Object[]) entityManager.createNativeQuery("""
                SELECT COALESCE(COUNT(id), 0), COALESCE(SUM(amount_collected), 0)
                FROM recovery_manager_operation
                WHERE operation_date BETWEEN :startDate AND :endDate
                """)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult();

        Map<String, Object> recoveries = new LinkedHashMap<>();
        recoveries.put("timelineTotals", Map.of("count", toInt(totals[0]), "amount", toDouble(totals[1])));
        recoveries.put("recoveryManagerSubReport", Map.of("count", toInt(rm[0]), "amount", toDouble(rm[1])));
        return recoveries;
    }

    private Map<String, Object> aggregateTontine(LocalDate startDate, LocalDate endDate) {
        Object[] deliveries = (Object[]) entityManager.createNativeQuery("""
                SELECT COALESCE(COUNT(id), 0), COALESCE(SUM(total_amount), 0)
                FROM tontine_delivery
                WHERE delivery_date BETWEEN :startDateTime AND :endDateTime
                """)
                .setParameter("startDateTime", startDate.atStartOfDay())
                .setParameter("endDateTime", endDate.atTime(23, 59, 59))
                .getSingleResult();

        Object[] fallbackCredits = (Object[]) entityManager.createNativeQuery("""
                SELECT COALESCE(COUNT(id), 0), COALESCE(SUM(total_amount), 0), COALESCE(SUM(profit_margin), 0)
                FROM credit
                WHERE accounting_date BETWEEN :startDate AND :endDate
                  AND type = 'TONTINE'
                """)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("deliveries", Map.of("count", toInt(deliveries[0]), "amount", toDouble(deliveries[1])));
        map.put("creditFallback", Map.of(
                "count", toInt(fallbackCredits[0]),
                "amount", toDouble(fallbackCredits[1]),
                "margin", toDouble(fallbackCredits[2])
        ));
        return map;
    }

    private List<Map<String, Object>> aggregateDailySummary(LocalDate startDate, LocalDate endDate) {
        List<DailyCommercialReport> aggregated = dailyCommercialReportRepository.findAggregatedByDateBetween(startDate, endDate);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (DailyCommercialReport row : aggregated) {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("commercialUsername", row.getCommercialUsername());
            dto.put("creditSalesAmount", row.getCreditSalesAmount());
            dto.put("creditSalesMargin", row.getCreditSalesMargin());
            dto.put("stockRequestAmount", row.getTotalStockRequestAmount());
            dto.put("stockRequestMargin", row.getStockRequestMargin());
            dto.put("ordersAmountExcluded", row.getOrdersAmount());
            rows.add(dto);
        }
        return rows;
    }

    private Map<String, Object> toSummaryMap(Object[] row) {
        return Map.of(
                "count", toInt(row[0]),
                "revenue", toDouble(row[1]),
                "purchase", toDouble(row[2]),
                "margin", toDouble(row[3])
        );
    }

    private double toDouble(Object value) {
        if (value == null) {
            return 0.0;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.parseDouble(String.valueOf(value));
    }

    private int toInt(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
