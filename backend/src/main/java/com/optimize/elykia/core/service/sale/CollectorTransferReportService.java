package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.sale.CollectorTransferDetailDto;
import com.optimize.elykia.core.dto.sale.CollectorTransferPairDto;
import com.optimize.elykia.core.dto.sale.CollectorTransferSummaryDto;
import com.optimize.elykia.core.repository.CreditCollectorHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CollectorTransferReportService {

    private final CreditCollectorHistoryRepository creditCollectorHistoryRepository;

    public CollectorTransferSummaryDto getSummary(String oldCollector, String newCollector,
                                                  LocalDate fromDate, LocalDate toDate) {
        List<Object[]> rows = creditCollectorHistoryRepository.aggregateByCollectorPair(
                blankToNull(oldCollector),
                blankToNull(newCollector),
                toStart(fromDate),
                toExclusiveEnd(toDate));

        List<CollectorTransferPairDto> pairs = rows.stream().map(this::mapPair).toList();

        long creditCount = 0L;
        double totalSales = 0D;
        double totalPaid = 0D;
        double totalRemaining = 0D;
        for (CollectorTransferPairDto pair : pairs) {
            creditCount += pair.getCreditCount();
            totalSales += pair.getTotalSalesAmount();
            totalPaid += pair.getTotalPaidAtTransfer();
            totalRemaining += pair.getTotalRemainingAtTransfer();
        }

        return CollectorTransferSummaryDto.builder()
                .creditCount(creditCount)
                .totalSalesAmount(totalSales)
                .totalPaidAtTransfer(totalPaid)
                .totalRemainingAtTransfer(totalRemaining)
                .byPair(pairs)
                .build();
    }

    public Page<CollectorTransferDetailDto> getDetails(String oldCollector, String newCollector,
                                                       LocalDate fromDate, LocalDate toDate,
                                                       Pageable pageable) {
        Pageable unsorted = PageRequest.of(
                Math.max(pageable.getPageNumber(), 0),
                Math.max(pageable.getPageSize(), 1));
        return creditCollectorHistoryRepository.findTransferDetails(
                        blankToNull(oldCollector),
                        blankToNull(newCollector),
                        toStart(fromDate),
                        toExclusiveEnd(toDate),
                        unsorted)
                .map(this::mapDetail);
    }

    private CollectorTransferPairDto mapPair(Object[] row) {
        return CollectorTransferPairDto.builder()
                .oldCollector((String) row[0])
                .newCollector((String) row[1])
                .creditCount(toLong(row[2]))
                .totalSalesAmount(toDouble(row[3]))
                .totalPaidAtTransfer(toDouble(row[4]))
                .totalRemainingAtTransfer(toDouble(row[5]))
                .firstTransferDate(toLocalDateTime(row[6]))
                .lastTransferDate(toLocalDateTime(row[7]))
                .build();
    }

    private CollectorTransferDetailDto mapDetail(Object[] row) {
        return CollectorTransferDetailDto.builder()
                .historyId(toLong(row[0]))
                .creditId(toLong(row[1]))
                .creditReference((String) row[2])
                .creditStatus(row[3] != null ? row[3].toString() : null)
                .clientName(blankToNull((String) row[4]))
                .clientPhone((String) row[5])
                .oldCollector((String) row[6])
                .newCollector((String) row[7])
                .totalAmount(toDoubleObj(row[8]))
                .totalAmountPaid(toDoubleObj(row[9]))
                .totalAmountRemaining(toDoubleObj(row[10]))
                .currentAmountPaid(toDoubleObj(row[11]))
                .currentAmountRemaining(toDoubleObj(row[12]))
                .changeDate(toLocalDateTime(row[13]))
                .operatedBy((String) row[14])
                .build();
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static LocalDateTime toStart(LocalDate date) {
        return date == null ? null : date.atStartOfDay();
    }

    private static LocalDateTime toExclusiveEnd(LocalDate date) {
        return date == null ? null : date.plusDays(1).atStartOfDay();
    }

    private static long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private static double toDouble(Object value) {
        Double d = toDoubleObj(value);
        return d == null ? 0D : d;
    }

    private static Double toDoubleObj(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.parseDouble(value.toString());
    }

    private static LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof java.util.Date date) {
            return new Timestamp(date.getTime()).toLocalDateTime();
        }
        return LocalDateTime.parse(value.toString().replace(' ', 'T'));
    }
}
