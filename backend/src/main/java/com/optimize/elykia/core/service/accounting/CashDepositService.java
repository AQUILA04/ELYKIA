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
import java.time.temporal.ChronoUnit;
import com.optimize.elykia.core.util.UserProfilConstant;

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
        
        if (deposit.getReference() == null || deposit.getReference().isEmpty()) {
            deposit.setReference("DEP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

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

    public CashDeposit cancelDeposit(Long id) {
        CashDeposit original = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Versement introuvable."));

        User currentUser = userService.getCurrentUser();

        // Rule: Only GESTIONNAIRE can cancel
        if (!currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new RuntimeException("Seul le gestionnaire est autorisé à annuler un versement.");
        }

        // Rule: 3 days limit
        long daysBetween = ChronoUnit.DAYS.between(original.getDate(), LocalDate.now());
        if (daysBetween > 3) {
            throw new RuntimeException("Le délai d'annulation de 3 jours est dépassé.");
        }

        // Prevent double negative
        if (original.getAmount() <= 0) {
            throw new RuntimeException("Impossible d'annuler ce versement.");
        }

        String origRef = original.getReference() != null && !original.getReference().isEmpty() ? original.getReference() : String.valueOf(original.getId());

        // Check if already cancelled
        if (((CashDepositRepository) repository).existsByReference("CANCEL-" + origRef)) {
            throw new RuntimeException("Ce versement a déjà été annulé.");
        }

        CashDeposit cancelDeposit = new CashDeposit();
        cancelDeposit.setAmount(-original.getAmount());
        cancelDeposit.setCommercialUsername(original.getCommercialUsername());
        cancelDeposit.setDate(original.getDate());
        cancelDeposit.setBilletage(null);
        cancelDeposit.setReference("CANCEL-" + origRef);
        cancelDeposit.setReceivedBy(currentUser.getUsername());

        // Update Daily Report
        DailyCommercialReport report = dailyReportRepository
                .findByDateAndCommercialUsername(cancelDeposit.getDate(), cancelDeposit.getCommercialUsername())
                .orElseThrow(() -> new RuntimeException("Rapport journalier introuvable pour ce versement."));

        report.setTotalAmountDeposited(report.getTotalAmountDeposited() + cancelDeposit.getAmount());
        dailyReportRepository.save(report);

        cancelDeposit.setDailyReport(report);
        CashDeposit saved = ((CashDepositRepository) repository).save(cancelDeposit);

        // Log Operation
        dailyOperationService.logOperation(
                cancelDeposit.getCommercialUsername(),
                OperationType.CASH_DEPOSIT_CANCEL,
                cancelDeposit.getAmount(),
                "Annulation Versement N° " + original.getId(),
                "Annulation du versement N° " + original.getId() + " par " + currentUser.getUsername() + " pour la date du "+ cancelDeposit.getDate());

        return saved;
    }
}
