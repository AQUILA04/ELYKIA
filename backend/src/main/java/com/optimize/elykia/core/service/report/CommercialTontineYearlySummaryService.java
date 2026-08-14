package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.report.CommercialTontineYearlySummaryDto;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommercialTontineYearlySummaryService {

    private final TontineCollectionRepository tontineCollectionRepository;
    private final DailyCommercialReportRepository dailyCommercialReportRepository;

    @Transactional(readOnly = true)
    public CommercialTontineYearlySummaryDto buildYearlySummary(String commercialUsername, int year) {
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = yearStart.plusYears(1).minusDays(1);
        LocalDateTime periodStart = yearStart.atStartOfDay();
        LocalDateTime periodEnd = yearStart.plusYears(1).atStartOfDay();

        List<Object[]> rows = tontineCollectionRepository.sumYearlyCollectionsByCommercial(
                commercialUsername, State.ENABLED, periodStart, periodEnd);
        double collected = 0.0;
        long collectionsCount = 0L;
        if (rows != null && !rows.isEmpty() && rows.get(0) != null) {
            Object[] row = rows.get(0);
            collected = number(row, 0).doubleValue();
            collectionsCount = number(row, 1).longValue();
        }

        Double depositedValue = dailyCommercialReportRepository
                .sumTontineDepositedByCommercialAndDateBetween(
                        commercialUsername, yearStart, yearEnd);
        double deposited = depositedValue != null ? depositedValue : 0.0;

        return CommercialTontineYearlySummaryDto.builder()
                .year(year)
                .commercialUsername(commercialUsername)
                .totalTontineCollectionsAmount(collected)
                .totalTontineCollectionsCount(collectionsCount)
                .totalTontineDepositedAmount(deposited)
                .remainingAtCommercialAmount(collected - deposited)
                .build();
    }

    private static Number number(Object[] row, int index) {
        if (row.length <= index || row[index] == null) {
            return 0;
        }
        return (Number) row[index];
    }
}
