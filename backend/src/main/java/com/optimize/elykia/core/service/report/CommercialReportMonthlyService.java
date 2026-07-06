package com.optimize.elykia.core.service.report;

import com.optimize.elykia.core.dto.report.CommercialYearlySummaryDto;
import com.optimize.elykia.core.entity.report.CommercialReportMonthly;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.CommercialReportMonthlyRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommercialReportMonthlyService {

    private final CommercialReportMonthlyRepository monthlyRepository;
    private final DailyCommercialReportRepository dailyReportRepository;

    @Transactional
    public void syncMonth(String commercialUsername, int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());

        List<DailyCommercialReport> dailyReports = dailyReportRepository
                .findByCommercialUsernameAndDateBetweenOrderByDateAsc(commercialUsername, start, end);

        double creditSalesAmount = 0.0;
        int creditSalesCount = 0;
        double collectionsAmount = 0.0;
        double totalAdvancesAmount = 0.0;
        double totalCreditDeposited = 0.0;

        for (DailyCommercialReport daily : dailyReports) {
            creditSalesAmount += safe(daily.getCreditSalesAmount());
            creditSalesCount += safeInt(daily.getCreditSalesCount());
            collectionsAmount += safe(daily.getCollectionsAmount());
            totalAdvancesAmount += safe(daily.getTotalAdvancesAmount());
            totalCreditDeposited += safe(daily.getTotalCreditAmountDeposited());
        }

        CommercialReportMonthly monthly = monthlyRepository
                .findByCommercialUsernameAndYearAndMonth(commercialUsername, year, month)
                .orElseGet(() -> {
                    CommercialReportMonthly created = new CommercialReportMonthly();
                    created.setCommercialUsername(commercialUsername);
                    created.setYear(year);
                    created.setMonth(month);
                    return created;
                });

        monthly.setCreditSalesAmount(creditSalesAmount);
        monthly.setCreditSalesCount(creditSalesCount);
        monthly.setCollectionsAmount(collectionsAmount);
        monthly.setTotalAdvancesAmount(totalAdvancesAmount);
        monthly.setTotalCreditAmountDeposited(totalCreditDeposited);
        monthlyRepository.save(monthly);
    }

    @Transactional(readOnly = true)
    public CommercialYearlySummaryDto getYearlySummary(String commercialUsername, int year) {
        List<Object[]> rows = monthlyRepository.sumYearlyTotals(commercialUsername, year);
        double totalSales = 0.0;
        int totalSalesCount = 0;
        double totalDeposited = 0.0;

        if (!rows.isEmpty() && rows.get(0) != null) {
            Object[] row = rows.get(0);
            totalSales = row[0] != null ? ((Number) row[0]).doubleValue() : 0.0;
            totalSalesCount = row[1] != null ? ((Number) row[1]).intValue() : 0;
            totalDeposited = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
        }

        return CommercialYearlySummaryDto.builder()
                .year(year)
                .commercialUsername(commercialUsername)
                .totalCreditSalesAmount(totalSales)
                .totalCreditSalesCount(totalSalesCount)
                .totalCreditDepositedAmount(totalDeposited)
                .remainingAtClientsAmount(totalSales - totalDeposited)
                .build();
    }

    @Transactional
    public void syncFromDailyReport(DailyCommercialReport report) {
        if (report == null || report.getCommercialUsername() == null || report.getDate() == null) {
            return;
        }
        syncMonth(
                report.getCommercialUsername(),
                report.getDate().getYear(),
                report.getDate().getMonthValue());
    }

    private static double safe(Double value) {
        return value != null ? value : 0.0;
    }

    private static int safeInt(Integer value) {
        return value != null ? value : 0;
    }
}
