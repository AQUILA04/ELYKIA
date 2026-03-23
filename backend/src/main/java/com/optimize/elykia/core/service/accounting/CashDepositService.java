package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.report.CashDeposit;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.service.report.DailyOperationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@Transactional
@Slf4j
public class CashDepositService extends GenericService<CashDeposit, Long> {

    private final DailyCommercialReportRepository dailyReportRepository;
    private final DailyOperationService dailyOperationService;
    private final UserService userService;

    public CashDepositService(CashDepositRepository repository,
            DailyCommercialReportRepository dailyReportRepository,
            DailyOperationService dailyOperationService,
            UserService userService) {
        super(repository);
        this.dailyReportRepository = dailyReportRepository;
        this.dailyOperationService = dailyOperationService;
        this.userService = userService;
    }

    public CashDeposit createDeposit(CashDeposit deposit) {
        User currentUser = userService.getCurrentUser();
        deposit.setReceivedBy(currentUser.getUsername());
        deposit.setDate(deposit.getDate() != null ? deposit.getDate() : LocalDate.now());

        // Update Daily Report
        DailyCommercialReport report = dailyReportRepository
                .findByDateAndCommercialUsername(deposit.getDate(), deposit.getCommercialUsername())
                .orElseGet(() -> {
                    DailyCommercialReport newReport = new DailyCommercialReport();
                    newReport.setDate(LocalDate.now());
                    newReport.setCommercialUsername(deposit.getCommercialUsername());
                    return dailyReportRepository.save(newReport);
                });

        report.setTotalAmountDeposited(report.getTotalAmountDeposited() + deposit.getAmount());
        dailyReportRepository.save(report);

        deposit.setDailyReport(report);
        CashDeposit saved = ((CashDepositRepository) repository).save(deposit);

        // Log Operation
        dailyOperationService.logOperation(
                deposit.getCommercialUsername(),
                OperationType.CASH_DEPOSIT,
                deposit.getAmount(),
                "Versement " + saved.getId(),
                "Versement effectué par " + currentUser.getUsername() + " Pour la date du "+ deposit.getDate());

        return saved;
    }

    public Page<CashDeposit> getDeposits(LocalDate startDate, LocalDate endDate, String commercialUsername,
            Pageable pageable) {
        if (commercialUsername != null) {
            if (startDate != null && endDate != null) {
                return ((CashDepositRepository) repository).findByDateBetweenAndCommercialUsername(startDate, endDate,
                        commercialUsername, pageable);
            } else if (startDate != null) {
                return ((CashDepositRepository) repository).findByDateAndCommercialUsername(startDate,
                        commercialUsername,
                        pageable);
            }
        } else {
            if (startDate != null && endDate != null) {
                return ((CashDepositRepository) repository).findByDateBetween(startDate, endDate, pageable);
            }
        }
        return Page.empty();
    }
}
