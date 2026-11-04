package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.sale.RecoveryManagerActivityDto;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.RecoveryManagerOperationRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecoveryManagerActivityService {

    private final CreditFieldControlRepository creditFieldControlRepository;
    private final TontineMemberFieldControlRepository tontineFieldControlRepository;
    private final CreditRepository creditRepository;
    private final TontineMemberRepository tontineMemberRepository;
    private final RecoveryManagerOperationRepository operationRepository;

    public RecoveryManagerActivityDto getActivity(LocalDate startDate, LocalDate endDate,
                                                  String recoveryManagerUsername, String commercialUsername) {
        String observer = StringUtils.hasText(recoveryManagerUsername) ? recoveryManagerUsername.trim() : null;
        String commercial = StringUtils.hasText(commercialUsername) ? commercialUsername.trim() : null;
        LocalDateTime startAt = startDate.atStartOfDay();
        LocalDateTime endAt = endDate.plusDays(1).atStartOfDay();
        int sessionYear = endDate.getYear();

        long[] creditCoverage = coverage(creditFieldControlRepository.summarizeInProgressCoverage(
                observer, startAt, endAt, commercial));
        long creditEvents = observer == null ? 0 : creditFieldControlRepository.countEvents(
                observer, startAt, endAt, commercial);
        long creditPortfolio = creditRepository.countEnabledInProgress(commercial);

        long[] tontineCoverage = coverage(tontineFieldControlRepository.summarizeInProgressCoverage(
                observer, startAt, endAt, sessionYear, commercial));
        long tontineEvents = observer == null ? 0 : tontineFieldControlRepository.countEvents(
                observer, startAt, endAt, commercial);
        long tontinePortfolio = tontineMemberRepository.countInProgressForSession(sessionYear, commercial);

        int partial = countPartial(startDate, endDate, observer, commercial, true);
        int full = countPartial(startDate, endDate, observer, commercial, false);

        long creditVerifications = observer == null ? 0 : creditRepository.countCarnetVerifiedByObserver(
                observer, startAt, endAt, commercial);
        long tontineVerifications = observer == null ? 0 : tontineMemberRepository.countCarnetVerifiedByObserver(
                observer, startAt, endAt, commercial);

        return RecoveryManagerActivityDto.builder()
                .creditControlsDone(toInt(creditCoverage[0]))
                .creditControlsConforme(toInt(creditCoverage[1]))
                .creditControlsEcart(toInt(creditCoverage[2]))
                .creditControlsEvents(toInt(creditEvents))
                .creditPortfolioTotal(toInt(creditPortfolio))
                .creditCoveragePercent(coveragePercent(creditCoverage[0], creditPortfolio))
                .tontineControlsDone(toInt(tontineCoverage[0]))
                .tontineControlsConforme(toInt(tontineCoverage[1]))
                .tontineControlsEcart(toInt(tontineCoverage[2]))
                .tontineControlsEvents(toInt(tontineEvents))
                .tontinePortfolioTotal(toInt(tontinePortfolio))
                .tontineCoveragePercent(coveragePercent(tontineCoverage[0], tontinePortfolio))
                .creditFullClosures(full)
                .creditPartialClosures(partial)
                .creditClosuresCount(full + partial)
                .creditCarnetVerifications(toInt(creditVerifications))
                .tontineCarnetVerifications(toInt(tontineVerifications))
                .build();
    }

    private int countPartial(LocalDate startDate, LocalDate endDate, String observer, String commercial, boolean partial) {
        Integer count = operationRepository.countOperationsByPartial(startDate, endDate, observer, commercial, partial);
        return count != null ? count : 0;
    }

    static long[] coverage(List<Object[]> rows) {
        if (rows == null || rows.isEmpty() || rows.get(0) == null) {
            return new long[3];
        }
        Object head = rows.get(0);
        Object[] row = head instanceof Object[] array ? array : new Object[]{head};
        return new long[]{asLong(row, 0), asLong(row, 1), asLong(row, 2)};
    }

    private static long asLong(Object[] row, int index) {
        if (row.length <= index || row[index] == null) {
            return 0L;
        }
        Object value = row[index];
        return value instanceof Number number ? number.longValue() : 0L;
    }

    static int coveragePercent(long done, long total) {
        if (total <= 0 || done <= 0) {
            return 0;
        }
        return (int) Math.round((done * 100.0) / total);
    }

    private static int toInt(long value) {
        if (value <= 0) {
            return 0;
        }
        return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
    }
}
