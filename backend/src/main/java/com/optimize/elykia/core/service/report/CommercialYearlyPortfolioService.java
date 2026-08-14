package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.report.CommercialYearlySummaryDto;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CommercialReportMonthlyRepository;
import com.optimize.elykia.core.repository.CreditCollectorHistoryRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Bilan annuel crédit — option B : portefeuille confié avec stock d'ouverture au 01/01.
 * Les rapports journaliers ne sont jamais modifiés.
 */
@Service
@RequiredArgsConstructor
public class CommercialYearlyPortfolioService {

    private final CommercialReportMonthlyRepository monthlyRepository;
    private final CreditRepository creditRepository;
    private final CreditCollectorHistoryRepository collectorHistoryRepository;

    @Transactional(readOnly = true)
    public CommercialYearlySummaryDto buildYearlySummary(String commercialUsername, int year) {
        List<Object[]> rows = monthlyRepository.sumYearlyTotals(commercialUsername, year);
        double openings = 0.0;
        int openingsCount = 0;
        double deposited = 0.0;

        if (!rows.isEmpty() && rows.get(0) != null) {
            Object[] row = rows.get(0);
            openings = row[0] != null ? ((Number) row[0]).doubleValue() : 0.0;
            openingsCount = row[1] != null ? ((Number) row[1]).intValue() : 0;
            deposited = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
        }

        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDateTime periodStart = yearStart.atStartOfDay();
        LocalDateTime periodEnd = yearStart.plusYears(1).atStartOfDay();

        double openingStock = safeDouble(creditRepository.sumOpeningStockAtDate(
                commercialUsername, yearStart, periodStart));
        double received = safeDouble(collectorHistoryRepository.sumCreditsReceivedInPeriod(
                commercialUsername, periodStart, periodEnd));
        double ceded = safeDouble(collectorHistoryRepository.sumCreditsCededInPeriod(
                commercialUsername, periodStart, periodEnd));
        double entrusted = openingStock + openings + received - ceded;

        double paidOnPortfolio = safeDouble(creditRepository.sumTotalAmountPaidForCollector(
                commercialUsername, OperationType.CREDIT, State.ENABLED));
        double remainingAtClient = sumLiveRemaining(commercialUsername);

        return CommercialYearlySummaryDto.builder()
                .year(year)
                .commercialUsername(commercialUsername)
                .totalCreditSalesAmount(openings)
                .totalCreditSalesCount(openingsCount)
                .totalCreditDepositedAmount(deposited)
                .totalCreditPaidOnCreditsAmount(paidOnPortfolio)
                .openingStockAmount(openingStock)
                .creditsReceivedAmount(received)
                .creditsCededAmount(ceded)
                .entrustedPortfolioAmount(entrusted)
                .remainingAtCommercialAmount(entrusted - deposited)
                .remainingAtClientAmount(remainingAtClient)
                .build();
    }

    private double sumLiveRemaining(String commercialUsername) {
        List<Object[]> rows = creditRepository.sumLiveRemainingAtClients(
                commercialUsername, OperationType.CREDIT, State.ENABLED);
        if (rows == null || rows.isEmpty() || rows.get(0) == null) {
            return 0.0;
        }
        Object[] cells = rows.get(0);
        return cells.length > 1 && cells[1] != null ? ((Number) cells[1]).doubleValue() : 0.0;
    }

    private static double safeDouble(Double value) {
        return value != null ? value : 0.0;
    }
}
