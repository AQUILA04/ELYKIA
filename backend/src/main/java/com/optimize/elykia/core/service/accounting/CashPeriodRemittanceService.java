package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.report.CashPeriodRemittanceDto;
import com.optimize.elykia.core.dto.report.CashPeriodRemittanceSummaryDto;
import com.optimize.elykia.core.entity.report.CashPeriodRemittance;
import com.optimize.elykia.core.enumaration.RemittanceInitiator;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.CashPeriodRemittanceRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
@Transactional
public class CashPeriodRemittanceService extends GenericService<CashPeriodRemittance, Long> {

    private final CashDepositRepository cashDepositRepository;
    private final UserService userService;

    public CashPeriodRemittanceService(
            CashPeriodRemittanceRepository repository,
            CashDepositRepository cashDepositRepository,
            UserService userService) {
        super(repository);
        this.cashDepositRepository = cashDepositRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public CashPeriodRemittanceSummaryDto getSummary(int year, int month) {
        User currentUser = userService.getCurrentUser();
        PeriodTotals totals = computeTotals(year, month);
        CashPeriodRemittance existing = ((CashPeriodRemittanceRepository) repository)
                .findByYearAndMonth(year, month)
                .orElse(null);

        boolean isSecretary = currentUser.is(UserProfilConstant.SECRETARY);
        boolean isManager = currentUser.is(UserProfilConstant.GESTIONNAIRE);

        RemittanceStatus status = existing != null ? existing.getStatus() : null;
        boolean hasDeposits = totals.totalAmount() > 0;

        return CashPeriodRemittanceSummaryDto.builder()
                .year(year)
                .month(month)
                .totalAmount(totals.totalAmount())
                .creditAmount(totals.creditAmount())
                .tontineAmount(totals.tontineAmount())
                .newBalanceAmount(totals.newBalanceAmount())
                .status(status)
                .remittanceId(existing != null ? existing.getId() : null)
                .canSubmit(isSecretary && existing == null && hasDeposits)
                .canAcknowledge(isManager && existing != null && existing.getStatus() == RemittanceStatus.PENDING)
                .canInitiate(isManager && existing == null && hasDeposits)
                .build();
    }

    public CashPeriodRemittanceDto submitBySecretary(int year, int month) {
        User currentUser = userService.getCurrentUser();
        if (!currentUser.is(UserProfilConstant.SECRETARY)) {
            throw new RuntimeException("Seul le secrétaire peut soumettre une remise.");
        }
        assertNotExists(year, month);

        PeriodTotals totals = computeTotals(year, month);
        if (totals.totalAmount() <= 0) {
            throw new RuntimeException("Aucun versement enregistré pour cette période.");
        }

        CashPeriodRemittance remittance = buildRemittance(year, month, totals);
        remittance.setStatus(RemittanceStatus.PENDING);
        remittance.setInitiatedBy(RemittanceInitiator.SECRETARY);
        remittance.setSubmittedBy(currentUser.getUsername());
        remittance.setSubmittedAt(LocalDateTime.now());

        return toDto(((CashPeriodRemittanceRepository) repository).save(remittance));
    }

    public CashPeriodRemittanceDto acknowledgeByManager(Long id) {
        User currentUser = userService.getCurrentUser();
        if (!currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new RuntimeException("Seul le gestionnaire peut accuser réception.");
        }

        CashPeriodRemittance remittance = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Remise introuvable."));
        if (remittance.getStatus() != RemittanceStatus.PENDING) {
            throw new RuntimeException("Cette remise n'est pas en attente d'accusé de réception.");
        }

        remittance.setStatus(RemittanceStatus.RECEIVED);
        remittance.setReceivedBy(currentUser.getUsername());
        remittance.setReceivedAt(LocalDateTime.now());

        return toDto(repository.save(remittance));
    }

    public CashPeriodRemittanceDto initiateByManager(int year, int month) {
        User currentUser = userService.getCurrentUser();
        if (!currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new RuntimeException("Seul le gestionnaire peut initier une réception.");
        }
        assertNotExists(year, month);

        PeriodTotals totals = computeTotals(year, month);
        if (totals.totalAmount() <= 0) {
            throw new RuntimeException("Aucun versement enregistré pour cette période.");
        }

        CashPeriodRemittance remittance = buildRemittance(year, month, totals);
        remittance.setStatus(RemittanceStatus.RECEIVED);
        remittance.setInitiatedBy(RemittanceInitiator.MANAGER);
        remittance.setSubmittedBy(currentUser.getUsername());
        remittance.setSubmittedAt(LocalDateTime.now());
        remittance.setReceivedBy(currentUser.getUsername());
        remittance.setReceivedAt(LocalDateTime.now());

        return toDto(((CashPeriodRemittanceRepository) repository).save(remittance));
    }

    @Transactional(readOnly = true)
    public Page<CashPeriodRemittanceDto> list(Pageable pageable) {
        return repository.findAll(pageable).map(this::toDto);
    }

    private void assertNotExists(int year, int month) {
        if (((CashPeriodRemittanceRepository) repository).existsByYearAndMonth(year, month)) {
            throw new RuntimeException("Une remise existe déjà pour cette période.");
        }
    }

    private CashPeriodRemittance buildRemittance(int year, int month, PeriodTotals totals) {
        CashPeriodRemittance remittance = new CashPeriodRemittance();
        remittance.setYear(year);
        remittance.setMonth(month);
        remittance.setTotalAmount(totals.totalAmount());
        remittance.setCreditAmount(totals.creditAmount());
        remittance.setTontineAmount(totals.tontineAmount());
        remittance.setNewBalanceAmount(totals.newBalanceAmount());
        remittance.setReference("REM-" + year + "-" + String.format("%02d", month));
        return remittance;
    }

    private PeriodTotals computeTotals(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();

        List<Object[]> rows = cashDepositRepository.sumDepositsByPeriod(start, end);
        if (rows == null || rows.isEmpty() || rows.get(0) == null) {
            return new PeriodTotals(0, 0, 0, 0);
        }
        Object[] values = rows.get(0);
        return new PeriodTotals(
                toDouble(values[0]),
                toDouble(values[1]),
                toDouble(values[2]),
                toDouble(values[3]));
    }

    private static double toDouble(Object value) {
        if (value == null) {
            return 0.0;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return 0.0;
    }

    private CashPeriodRemittanceDto toDto(CashPeriodRemittance entity) {
        return CashPeriodRemittanceDto.builder()
                .id(entity.getId())
                .year(entity.getYear())
                .month(entity.getMonth())
                .totalAmount(entity.getTotalAmount())
                .creditAmount(entity.getCreditAmount())
                .tontineAmount(entity.getTontineAmount())
                .newBalanceAmount(entity.getNewBalanceAmount())
                .status(entity.getStatus())
                .initiatedBy(entity.getInitiatedBy())
                .submittedBy(entity.getSubmittedBy())
                .receivedBy(entity.getReceivedBy())
                .submittedAt(entity.getSubmittedAt())
                .receivedAt(entity.getReceivedAt())
                .reference(entity.getReference())
                .build();
    }

    private record PeriodTotals(double totalAmount, double creditAmount, double tontineAmount,
            double newBalanceAmount) {
    }
}
