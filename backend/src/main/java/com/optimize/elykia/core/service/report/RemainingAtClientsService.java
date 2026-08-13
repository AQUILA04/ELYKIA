package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.report.RemainingAtClientsCreditDto;
import com.optimize.elykia.core.dto.report.RemainingAtClientsPageDto;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RemainingAtClientsService {

    private final CreditRepository creditRepository;

    @Transactional(readOnly = true)
    public RemainingAtClientsPageDto getPage(String commercialUsername, int year, Pageable pageable) {
        validate(commercialUsername, year);
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);

        Page<RemainingAtClientsCreditDto> page = creditRepository.findRemainingAtClientsCredits(
                commercialUsername, OperationType.CREDIT, State.ENABLED, start, end, pageable);
        Aggregate aggregate = loadAggregate(commercialUsername, start, end);

        return new RemainingAtClientsPageDto(page, aggregate.salesCount(), aggregate.totalRemainingAmount());
    }

    @Transactional(readOnly = true)
    public List<RemainingAtClientsCreditDto> findAll(String commercialUsername, int year) {
        validate(commercialUsername, year);
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);
        return creditRepository.findAllRemainingAtClientsCredits(
                commercialUsername, OperationType.CREDIT, State.ENABLED, start, end);
    }

    @Transactional(readOnly = true)
    public Aggregate loadAggregate(String commercialUsername, int year) {
        validate(commercialUsername, year);
        return loadAggregate(commercialUsername, LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
    }

    private Aggregate loadAggregate(String commercialUsername, LocalDate start, LocalDate end) {
        List<Object[]> rows = creditRepository.sumRemainingAtClients(
                commercialUsername, OperationType.CREDIT, State.ENABLED, start, end);
        if (rows == null || rows.isEmpty() || rows.get(0) == null) {
            return new Aggregate(0L, 0.0);
        }
        Object[] cells = rows.get(0);
        long count = cells[0] != null ? ((Number) cells[0]).longValue() : 0L;
        double sum = cells.length > 1 && cells[1] != null ? ((Number) cells[1]).doubleValue() : 0.0;
        return new Aggregate(count, sum);
    }

    private static void validate(String commercialUsername, int year) {
        if (commercialUsername == null || commercialUsername.isBlank()) {
            throw new CustomValidationException("Un commercial doit être sélectionné.");
        }
        if (year < 2000 || year > 2100) {
            throw new CustomValidationException("Année invalide.");
        }
    }

    public record Aggregate(long salesCount, double totalRemainingAmount) {
    }
}
