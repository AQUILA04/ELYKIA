package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.CloseCollectorOperationDto;
import com.optimize.elykia.core.entity.accounting.AccountingDay;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import com.optimize.elykia.core.entity.accounting.DailyAccounting;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.repository.AccountingDayRepository;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
@Getter
@Slf4j
public class AccountingDayService extends GenericService<AccountingDay, Long> {

    private static final int MAX_ACCOUNTING_DATE_LOOKUP_DAYS = 366;

    private final Object accountingDayLock = new Object();

    private final DailyAccountingService dailyAccountingService;
    private final AccountingDayStepExecutor accountingDayStepExecutor;

    protected AccountingDayService(AccountingDayRepository repository,
                                   DailyAccountingService dailyAccountingService,
                                   AccountingDayStepExecutor accountingDayStepExecutor) {
        super(repository);
        this.dailyAccountingService = dailyAccountingService;
        this.accountingDayStepExecutor = accountingDayStepExecutor;
    }

    @Transactional
    public Map<String, Object> hasOpenedDay() {
        Map<String, Object> response = new java.util.HashMap<>(Map.of("status", Boolean.TRUE));
            response.put("accountingDate", LocalDate.now());
         return response;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public AccountingDay openAccountingDay() {
        synchronized (accountingDayLock) {
            return doOpenAccountingDay();
        }
    }

    public AccountingDay getByStatus(AccountingDayStatus status) {
        return getRepository().findByStatus(status).orElseThrow(() -> new ResourceNotFoundException("Journée comptable introuvable !"));
    }

    /**
     * Lecture seule de la date comptable ouverte, sans déclencher de bascule automatique.
     * À utiliser pour les requêtes fréquentes (listes, exports) afin d'éviter une charge CPU inutile.
     */
    public LocalDate getOpenAccountingDate() {
        return getRepository().findByStatus(AccountingDayStatus.OPENED)
                .map(AccountingDay::getAccountingDate)
                .orElse(LocalDate.now());
    }

    /**
     * Lecture seule de la date comptable ouverte.
     * Ne déclenche jamais de fermeture/ouverture automatique.
     */
    @Transactional(readOnly = true)
    public LocalDate getCurrentAccountingDate() {
        return getOpenAccountingDate();
    }

    /**
     * Bascule la journée comptable si la journée ouverte est antérieure à aujourd'hui,
     * ou en ouvre une si aucune n'est ouverte. À appeler explicitement (endpoint /current, cron)
     * et non sur chaque lecture métier.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public LocalDate ensureCurrentAccountingDay() {
        synchronized (accountingDayLock) {
            return doEnsureCurrentAccountingDay();
        }
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public AccountingDay closeAccountingDay() {
        synchronized (accountingDayLock) {
            return doCloseAccountingDay();
        }
    }

    @Transactional
    public DailyAccountancy closeCollectorOperation(CloseCollectorOperationDto dto) {
        return dailyAccountingService.closeCollectorOperation(dto, getOpenAccountingDate());
    }

    private LocalDate doEnsureCurrentAccountingDay() {
        Optional<AccountingDay> openedDay = accountingDayStepExecutor.findOpenedAccountingDay();
        if (openedDay.isEmpty()) {
            return doOpenAccountingDay().getAccountingDate();
        }
        AccountingDay accountingDay = openedDay.get();
        if (accountingDay.getAccountingDate().isBefore(LocalDate.now())) {
            doCloseAccountingDay();
            return doOpenAccountingDay().getAccountingDate();
        }
        return accountingDay.getAccountingDate();
    }

    private AccountingDay doOpenAccountingDay() {
        long start = System.currentTimeMillis();
        Optional<AccountingDay> openedDay = accountingDayStepExecutor.findOpenedAccountingDay();
        if (openedDay.isPresent()) {
            AccountingDay existing = openedDay.get();
            if (!existing.getAccountingDate().isBefore(LocalDate.now())) {
                return existing;
            }
            doCloseAccountingDay();
        }

        LocalDate nextDate = resolveNextAvailableAccountingDate(LocalDate.now());
        closeStaleOpenCashDesks();

        AccountingDay accountingDay = accountingDayStepExecutor.createAndOpenAccountingDay(nextDate);
        log.info("Journée comptable {} ouverte en {} ms", nextDate, System.currentTimeMillis() - start);
        return accountingDay;
    }

    private AccountingDay doCloseAccountingDay() {
        long start = System.currentTimeMillis();
        AccountingDay accountingDay = accountingDayStepExecutor.findOpenedAccountingDay()
                .orElseThrow(() -> new ResourceNotFoundException("Journée comptable introuvable !"));
        LocalDate accountingDate = accountingDay.getAccountingDate();
        Long accountingDayId = accountingDay.getId();
        closeOpenCashDesksForDate(accountingDate);
        accountingDayStepExecutor.closeDailyAccountingRecord(accountingDate);
        accountingDayStepExecutor.finalizeClosedAccountingDay(accountingDayId);
        log.info("Journée comptable {} fermée en {} ms", accountingDate, System.currentTimeMillis() - start);
        return accountingDayStepExecutor.findAccountingDayById(accountingDayId).orElse(accountingDay);
    }

    private void closeOpenCashDesksForDate(LocalDate accountingDate) {
        if (!accountingDayStepExecutor.hasOpenCashDesks()) {
            return;
        }
        List<DailyAccountancy> openDesks = accountingDayStepExecutor.findOpenCashDesks();
        log.info("Fermeture de {} caisse(s) ouverte(s) pour la date {}", openDesks.size(), accountingDate);
        for (DailyAccountancy dailyAccountancy : openDesks) {
            CloseCollectorOperationDto dto = new CloseCollectorOperationDto();
            dto.setCollector(dailyAccountancy.getCollector());
            dto.setRealTotalAmount(dailyAccountancy.getRealBalance());
            accountingDayStepExecutor.closeOpenCashDesk(dto, accountingDate);
        }
    }

    /** Ferme les caisses restées ouvertes avant l'ouverture d'une nouvelle journée. */
    private void closeStaleOpenCashDesks() {
        if (!accountingDayStepExecutor.hasOpenCashDesks()) {
            return;
        }
        List<DailyAccountancy> openDesks = accountingDayStepExecutor.findOpenCashDesks();
        log.info("Nettoyage de {} caisse(s) ouverte(s) avant ouverture journée", openDesks.size());
        for (DailyAccountancy dailyAccountancy : openDesks) {
            CloseCollectorOperationDto dto = new CloseCollectorOperationDto();
            dto.setCollector(dailyAccountancy.getCollector());
            dto.setRealTotalAmount(dailyAccountancy.getRealBalance());
            LocalDate deskDate = dailyAccountancy.getAccountingDate() != null
                    ? dailyAccountancy.getAccountingDate()
                    : LocalDate.now();
            accountingDayStepExecutor.closeOpenCashDesk(dto, deskDate);
            accountingDayStepExecutor.closeDailyAccountingRecord(deskDate);
        }
    }

    private LocalDate resolveNextAvailableAccountingDate(LocalDate startDate) {
        LocalDate candidate = startDate;
        for (int day = 0; day < MAX_ACCOUNTING_DATE_LOOKUP_DAYS; day++) {
            if (!accountingDayStepExecutor.existsClosedAccountingDayForDate(candidate)) {
                return candidate;
            }
            candidate = candidate.plusDays(1);
        }
        throw new ApplicationException(
                "Impossible de trouver une date comptable disponible dans les " + MAX_ACCOUNTING_DATE_LOOKUP_DAYS + " prochains jours");
    }

    public Page<DailyAccounting> getAllDailyAccounting(Pageable pageable) {
        Sort sort = Sort.by(Sort.Direction.DESC, "id");
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        return dailyAccountingService.getAll(pageable);
    }

    public AccountingDayRepository getRepository() {
        return (AccountingDayRepository) super.getRepository();
    }
}

