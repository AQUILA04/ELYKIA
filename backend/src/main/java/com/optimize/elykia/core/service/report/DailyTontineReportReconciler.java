package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.util.CashDepositCategoryCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

/**
 * Rebuild des compteurs tontine du rapport journalier depuis {@code tontine_collection}.
 * <ul>
 *   <li>activité ({@code tontine_collections_*}) → commercial + {@code collectionDate}</li>
 *   <li>part tontine de {@code total_amount_to_deposit} → même base ({@code collectionDate} / jour métier rattrapage)</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DailyTontineReportReconciler {

    private final TontineCollectionRepository tontineCollectionRepository;
    private final DailyCommercialReportRepository dailyReportRepository;
    private final DailyCommercialReportPersistence reportPersistence;

    @Transactional
    public void reconcile(String commercialUsername, LocalDate date) {
        if (!StringUtils.hasText(commercialUsername) || date == null) {
            return;
        }
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();

        final double activityAmount;
        final int activityCount;
        List<Object[]> activityRows = tontineCollectionRepository.sumByCommercialAndCollectionDate(
                commercialUsername, State.ENABLED, dayStart, dayEnd);
        if (activityRows != null && !activityRows.isEmpty() && activityRows.get(0) != null) {
            Object[] row = activityRows.get(0);
            activityAmount = number(row, 0).doubleValue();
            activityCount = number(row, 1).intValue();
        } else {
            activityAmount = 0.0;
            activityCount = 0;
        }

        DailyCommercialReport report = dailyReportRepository
                .findByDateAndCommercialUsername(date, commercialUsername)
                .orElseGet(() -> {
                    if (activityAmount == 0.0 && activityCount == 0) {
                        return null;
                    }
                    DailyCommercialReport created = new DailyCommercialReport();
                    created.setDate(date);
                    created.setCommercialUsername(commercialUsername);
                    return created;
                });
        if (report == null) {
            return;
        }

        report.setTontineCollectionsAmount(activityAmount);
        report.setTontineCollectionsCount(activityCount);

        double creditPart = CashDepositCategoryCalculator.creditToDeposit(report);
        double newBalancePart = CashDepositCategoryCalculator.newBalanceToDeposit(report);
        double rebuiltToDeposit = creditPart + activityAmount + newBalancePart;
        report.setTotalAmountToDeposit(Math.max(0.0, rebuiltToDeposit));

        reportPersistence.save(report);
        log.debug("Reconciled tontine daily report {} / {} : activity={} ({}), toDeposit={}",
                commercialUsername, date, activityAmount, activityCount, rebuiltToDeposit);
    }

    @Transactional
    public void reconcileAll(String commercialUsername, Collection<LocalDate> dates) {
        if (!StringUtils.hasText(commercialUsername) || dates == null) {
            return;
        }
        dates.stream().filter(Objects::nonNull).distinct().forEach(date -> reconcile(commercialUsername, date));
    }

    private static Number number(Object[] row, int index) {
        if (row.length <= index || row[index] == null) {
            return 0;
        }
        return (Number) row[index];
    }
}
