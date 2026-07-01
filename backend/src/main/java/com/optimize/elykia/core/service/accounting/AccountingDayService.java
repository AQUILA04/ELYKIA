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
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.Getter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
@Getter
public class AccountingDayService extends GenericService<AccountingDay, Long> {

    private static final int MAX_ACCOUNTING_DATE_LOOKUP_DAYS = 366;

    private final Object accountingDayLock = new Object();

    private final DailyAccountingService dailyAccountingService;
    private final CreditRepository creditRepository;

    protected AccountingDayService(AccountingDayRepository repository,
                                   DailyAccountingService dailyAccountingService,
                                   CreditRepository creditRepository) {
        super(repository);
        this.dailyAccountingService = dailyAccountingService;
        this.creditRepository = creditRepository;
    }

    @Transactional
    public Map<String, Object> hasOpenedDay() {
        Map<String, Object> response = new java.util.HashMap<>(Map.of("status", Boolean.TRUE));
            response.put("accountingDate", LocalDate.now());
         return response;
    }

    @Transactional
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
    @Transactional
    public LocalDate ensureCurrentAccountingDay() {
        synchronized (accountingDayLock) {
            return doEnsureCurrentAccountingDay();
        }
    }

    @Transactional
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
        Optional<AccountingDay> openedDay = getRepository().findByStatus(AccountingDayStatus.OPENED);
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
        Optional<AccountingDay> openedDay = getRepository().findByStatus(AccountingDayStatus.OPENED);
        if (openedDay.isPresent()) {
            AccountingDay existing = openedDay.get();
            if (!existing.getAccountingDate().isBefore(LocalDate.now())) {
                return existing;
            }
            doCloseAccountingDay();
        }

        AccountingDay accountingDay = new AccountingDay();
        accountingDay.setAccountingDate(resolveNextAvailableAccountingDate(LocalDate.now()));

        if (this.dailyAccountingService.getDailyAccountancyService().isExistsOpenedCashDesk()) {
            this.dailyAccountingService.getDailyAccountancyService().getOpenCashDesks().forEach(dailyAccountancy -> {
                CloseCollectorOperationDto dto = new CloseCollectorOperationDto();
                dto.setCollector(dailyAccountancy.getCollector());
                dto.setRealTotalAmount(dailyAccountancy.getRealBalance());
                dailyAccountingService.closeCollectorOperation(dto, dailyAccountancy.getAccountingDate());
                dailyAccountingService.closeDailyAccounting(dailyAccountancy.getAccountingDate());
            });
        }
        create(accountingDay);
        dailyAccountingService.initDailyAccounting(accountingDay.getAccountingDate());
        creditRepository.updateDailyPaidForCredit();
        return accountingDay;
    }

    private AccountingDay doCloseAccountingDay() {
        final LocalDate accountingDate = getByStatus(AccountingDayStatus.OPENED).getAccountingDate();
        if (this.dailyAccountingService.getDailyAccountancyService().isExistsOpenedCashDesk()) {
            this.dailyAccountingService.getDailyAccountancyService().getOpenCashDesks().forEach(dailyAccountancy -> {
                CloseCollectorOperationDto dto = new CloseCollectorOperationDto();
                dto.setCollector(dailyAccountancy.getCollector());
                dto.setRealTotalAmount(dailyAccountancy.getRealBalance());
                dailyAccountingService.closeCollectorOperation(dto, accountingDate);
            });
        }
        AccountingDay accountingDay = getByStatus(AccountingDayStatus.OPENED);

        dailyAccountingService.closeDailyAccounting(accountingDate);
        accountingDay.close();
        update(accountingDay);
        return accountingDay;
    }

    private LocalDate resolveNextAvailableAccountingDate(LocalDate startDate) {
        LocalDate candidate = startDate;
        for (int day = 0; day < MAX_ACCOUNTING_DATE_LOOKUP_DAYS; day++) {
            if (!getRepository().existsByStatusAndAccountingDate(AccountingDayStatus.CLOSED, candidate)) {
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
