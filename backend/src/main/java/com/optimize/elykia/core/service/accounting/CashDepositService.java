package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.report.CashDeposit;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.service.report.DailyCommercialReportPersistence;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.util.CashDepositCategoryCalculator;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
@Transactional
@Slf4j
public class CashDepositService extends GenericService<CashDeposit, Long> {

    private final DailyCommercialReportRepository dailyReportRepository;
    private final DailyCommercialReportPersistence reportPersistence;
    private final DailyOperationService dailyOperationService;
    private final UserService userService;

    public CashDepositService(CashDepositRepository repository,
            DailyCommercialReportRepository dailyReportRepository,
            DailyCommercialReportPersistence reportPersistence,
            DailyOperationService dailyOperationService,
            UserService userService) {
        super(repository);
        this.dailyReportRepository = dailyReportRepository;
        this.reportPersistence = reportPersistence;
        this.dailyOperationService = dailyOperationService;
        this.userService = userService;
    }

    public CashDeposit createDeposit(CashDeposit deposit) {
        User currentUser = userService.getCurrentUser();
        deposit.setReceivedBy(currentUser.getUsername());
        deposit.setDate(deposit.getDate() != null ? deposit.getDate() : LocalDate.now());

        CashDepositRepository cashDepositRepository = (CashDepositRepository) repository;
        if (StringUtils.hasText(deposit.getReference()) && cashDepositRepository.existsByReference(deposit.getReference())) {
            return cashDepositRepository.findByReference(deposit.getReference()).orElseThrow();
        }

        if (!StringUtils.hasText(deposit.getReference())) {
            deposit.setReference("DEP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

        CashDepositCategoryCalculator.normalizeLegacyAmounts(deposit);
        CashDepositCategoryCalculator.validateCategorySplit(
                deposit.getAmount(),
                deposit.getCreditAmount(),
                deposit.getTontineAmount(),
                deposit.getNewBalanceAmount(),
                deposit.getSurplusAmount());

        DailyCommercialReport report = dailyReportRepository
                .findByDateAndCommercialUsername(deposit.getDate(), deposit.getCommercialUsername())
                .orElseGet(() -> {
                    DailyCommercialReport newReport = new DailyCommercialReport();
                    newReport.setDate(deposit.getDate());
                    newReport.setCommercialUsername(deposit.getCommercialUsername());
                    return newReport;
                });

        applyDepositToReport(report, deposit.getAmount(), deposit.getCreditAmount(),
                deposit.getTontineAmount(), deposit.getNewBalanceAmount(), deposit.getSurplusAmount());
        report = reportPersistence.save(report);

        deposit.setDailyReport(report);
        CashDeposit saved = cashDepositRepository.save(deposit);

        String logDetail = String.format(
                "Versement effectué par %s pour la date du %s (Crédit: %.0f, Tontine: %.0f, Solde Nx: %.0f%s)",
                currentUser.getUsername(),
                deposit.getDate(),
                deposit.getCreditAmount(),
                deposit.getTontineAmount(),
                deposit.getNewBalanceAmount(),
                safe(deposit.getSurplusAmount()) > 0
                        ? String.format(", Surplus: %.0f", deposit.getSurplusAmount())
                        : "");

        dailyOperationService.logOperation(
                deposit.getCommercialUsername(),
                OperationType.CASH_DEPOSIT,
                deposit.getAmount(),
                "Versement " + saved.getId(),
                logDetail);

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

        if (!currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new RuntimeException("Seul le gestionnaire est autorisé à annuler un versement.");
        }

        long daysBetween = ChronoUnit.DAYS.between(original.getDate(), LocalDate.now());
        if (daysBetween > 3) {
            throw new RuntimeException("Le délai d'annulation de 3 jours est dépassé.");
        }

        if (original.getAmount() <= 0) {
            throw new RuntimeException("Impossible d'annuler ce versement.");
        }

        assertDepositNotRemitted(original);

        String origRef = original.getReference() != null && !original.getReference().isEmpty()
                ? original.getReference()
                : String.valueOf(original.getId());

        CashDepositRepository cashDepositRepository = (CashDepositRepository) repository;
        String cancelReference = "CANCEL-" + origRef;
        if (cashDepositRepository.existsByReference(cancelReference)) {
            return cashDepositRepository.findByReference(cancelReference).orElseThrow();
        }

        CashDepositCategoryCalculator.normalizeLegacyAmounts(original);
        double credit = original.getCreditAmount() != null ? original.getCreditAmount() : original.getAmount();
        double tontine = original.getTontineAmount() != null ? original.getTontineAmount() : 0.0;
        double newBalance = original.getNewBalanceAmount() != null ? original.getNewBalanceAmount() : 0.0;
        double surplus = original.getSurplusAmount() != null ? original.getSurplusAmount() : 0.0;

        CashDeposit cancelDeposit = new CashDeposit();
        cancelDeposit.setAmount(-original.getAmount());
        cancelDeposit.setCreditAmount(-credit);
        cancelDeposit.setTontineAmount(-tontine);
        cancelDeposit.setNewBalanceAmount(-newBalance);
        cancelDeposit.setSurplusAmount(-surplus);
        cancelDeposit.setCommercialUsername(original.getCommercialUsername());
        cancelDeposit.setDate(original.getDate());
        cancelDeposit.setBilletage(null);
        cancelDeposit.setReference(cancelReference);
        cancelDeposit.setReceivedBy(currentUser.getUsername());

        DailyCommercialReport report = dailyReportRepository
                .findByDateAndCommercialUsername(cancelDeposit.getDate(), cancelDeposit.getCommercialUsername())
                .orElseThrow(() -> new RuntimeException("Rapport journalier introuvable pour ce versement."));

        applyDepositToReport(report, cancelDeposit.getAmount(), cancelDeposit.getCreditAmount(),
                cancelDeposit.getTontineAmount(), cancelDeposit.getNewBalanceAmount(),
                cancelDeposit.getSurplusAmount());
        report = reportPersistence.save(report);

        cancelDeposit.setDailyReport(report);
        CashDeposit saved = cashDepositRepository.save(cancelDeposit);

        dailyOperationService.logOperation(
                cancelDeposit.getCommercialUsername(),
                OperationType.CASH_DEPOSIT_CANCEL,
                cancelDeposit.getAmount(),
                "Annulation Versement N° " + original.getId(),
                "Annulation du versement N° " + original.getId() + " par " + currentUser.getUsername()
                        + " pour la date du " + cancelDeposit.getDate());

        return saved;
    }

    private void applyDepositToReport(DailyCommercialReport report, double amount, double credit, double tontine,
            double newBalance, double surplus) {
        report.setTotalAmountDeposited(safe(report.getTotalAmountDeposited()) + amount);
        report.setTotalCreditAmountDeposited(safe(report.getTotalCreditAmountDeposited()) + credit);
        report.setTotalTontineAmountDeposited(safe(report.getTotalTontineAmountDeposited()) + tontine);
        report.setTotalNewBalanceAmountDeposited(safe(report.getTotalNewBalanceAmountDeposited()) + newBalance);
        report.setTotalSurplusAmountDeposited(safe(report.getTotalSurplusAmountDeposited()) + surplus);
    }

    private void assertDepositNotRemitted(CashDeposit deposit) {
        if (deposit.getRemittance() == null) {
            return;
        }
        RemittanceStatus status = deposit.getRemittance().getStatus();
        if (status == RemittanceStatus.RECEIVED) {
            throw new RuntimeException(
                    "Impossible d'annuler un versement déjà remis au gestionnaire.");
        }
        if (status == RemittanceStatus.PENDING) {
            throw new RuntimeException(
                    "Impossible d'annuler un versement inclus dans une remise en attente.");
        }
    }

    private static double safe(Double value) {
        return value != null ? value : 0.0;
    }
}
