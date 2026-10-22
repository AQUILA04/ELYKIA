package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.report.CatchupAllocationPreviewDto;
import com.optimize.elykia.core.dto.report.CatchupSliceDto;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.service.accounting.CashDepositCatchupAllocator.CatchupCap;
import com.optimize.elykia.core.util.CashDepositCategoryCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CashDepositCatchupService {

    private static final double EPSILON = 0.01;

    private final TontineCollectionRepository tontineCollectionRepository;
    private final DailyCommercialReportRepository dailyReportRepository;

    public CatchupAllocationPreviewDto preview(String commercialUsername, LocalDate date) {
        CatchupAllocationPreviewDto preview = new CatchupAllocationPreviewDto();
        preview.setCommercialUsername(commercialUsername);
        preview.setDate(date);
        if (!StringUtils.hasText(commercialUsername) || date == null) {
            return preview;
        }
        DailyCommercialReport report = dailyReportRepository
                .findByDateAndCommercialUsername(date, commercialUsername)
                .orElse(null);
        preview.setRemainingCredit(openCredit(report));
        preview.setRemainingTontine(openTontine(report));
        preview.setRemainingNewBalance(openNewBalance(report));
        List<CatchupCap> caps = caps(commercialUsername, date);
        List<CatchupSliceDto> slices = new ArrayList<>();
        double catchupTotal = 0.0;
        for (CatchupCap cap : caps) {
            slices.add(new CatchupSliceDto(cap.collectionDate(), cap.capturedAmount(), cap.openRemaining(), cap.cap()));
            catchupTotal += cap.cap();
        }
        preview.setSlices(slices);
        preview.setCatchupTotal(catchupTotal);
        preview.setTotalRemaining(preview.getRemainingCredit() + preview.getRemainingTontine()
                + preview.getRemainingNewBalance() + catchupTotal);
        return preview;
    }

    public List<CatchupCap> caps(String commercialUsername, LocalDate captureDate) {
        if (!StringUtils.hasText(commercialUsername) || captureDate == null) {
            return List.of();
        }
        LocalDateTime dayStart = captureDate.atStartOfDay();
        LocalDateTime dayEnd = captureDate.plusDays(1).atStartOfDay();
        List<Object[]> rows = tontineCollectionRepository.findCatchupRowsByCommercialAndCreatedDate(
                commercialUsername, State.ENABLED, dayStart, dayEnd);
        Map<LocalDate, Double> capturedByDate = new TreeMap<>();
        if (rows != null) {
            for (Object[] row : rows) {
                if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
                    continue;
                }
                LocalDate collectionDay = ((LocalDateTime) row[0]).toLocalDate();
                if (collectionDay.equals(captureDate)) {
                    continue;
                }
                double amount = ((Number) row[1]).doubleValue();
                capturedByDate.merge(collectionDay, amount, Double::sum);
            }
        }
        List<CatchupCap> caps = new ArrayList<>();
        for (Map.Entry<LocalDate, Double> entry : capturedByDate.entrySet()) {
            DailyCommercialReport report = dailyReportRepository
                    .findByDateAndCommercialUsername(entry.getKey(), commercialUsername)
                    .orElse(null);
            double captured = Math.max(0.0, entry.getValue());
            double open = openTontine(report);
            CatchupCap candidate = new CatchupCap(entry.getKey(), captured, open, 0.0);
            double target = CashDepositCatchupAllocator.targetAmount(candidate);
            if (target > EPSILON) {
                caps.add(new CatchupCap(entry.getKey(), captured, open, target));
            }
        }
        return caps;
    }

    public double openCredit(DailyCommercialReport report) {
        if (report == null) {
            return 0.0;
        }
        return Math.max(0.0, CashDepositCategoryCalculator.creditToDeposit(report)
                - safe(report.getTotalCreditAmountDeposited())
                - safe(report.getSurplusCoverageCredit()));
    }

    public double openTontine(DailyCommercialReport report) {
        if (report == null) {
            return 0.0;
        }
        return Math.max(0.0, CashDepositCategoryCalculator.tontineToDeposit(report)
                - safe(report.getTotalTontineAmountDeposited())
                - safe(report.getSurplusCoverageTontine()));
    }

    public double openNewBalance(DailyCommercialReport report) {
        if (report == null) {
            return 0.0;
        }
        return Math.max(0.0, CashDepositCategoryCalculator.newBalanceToDeposit(report)
                - safe(report.getTotalNewBalanceAmountDeposited())
                - safe(report.getSurplusCoverageNewBalance()));
    }

    private static double safe(Double value) {
        return value != null ? value : 0.0;
    }
}
