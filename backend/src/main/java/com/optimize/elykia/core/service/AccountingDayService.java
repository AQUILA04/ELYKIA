package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.CloseCollectorOperationDto;
import com.optimize.elykia.core.entity.AccountingDay;
import com.optimize.elykia.core.entity.DailyAccountancy;
import com.optimize.elykia.core.entity.DailyAccounting;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.repository.AccountingDayRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import lombok.Getter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;

@Service
@Transactional(readOnly = true)
@Getter
public class AccountingDayService extends GenericService<AccountingDay, Long> {

    private final DailyAccountingService dailyAccountingService;
    private final CreditRepository creditRepository;

    protected AccountingDayService(AccountingDayRepository repository,
                                   DailyAccountingService dailyAccountingService,
                                   CreditRepository creditRepository) {
        super(repository);
        this.dailyAccountingService = dailyAccountingService;
        this.creditRepository = creditRepository;
    }

    public Map<String, Object> hasOpenedDay() {
        boolean status = getRepository().existsByStatus(AccountingDayStatus.OPENED);
        Map<String, Object> response = new java.util.HashMap<>(Map.of("status", getRepository().existsByStatus(AccountingDayStatus.OPENED)));
        if (status) {
            response.put("accountingDate", getCurrentAccountingDate());
        }
         return response;
    }

    @Transactional
    public AccountingDay openAccountingDay() {
        if (getRepository().existsByStatus(AccountingDayStatus.OPENED)) {
            throw new ApplicationException("Une journée comptable ouverte existe déjà !");
        }
        if (getRepository().existsByStatusAndAccountingDate(AccountingDayStatus.CLOSED, LocalDate.now())) {
            throw new ApplicationException("Cette Journée comptable est déjà fermée !");
        }
        AccountingDay accountingDay = new AccountingDay();
        create(accountingDay);
        dailyAccountingService.initDailyAccounting(accountingDay.getAccountingDate());
        creditRepository.updateDailyPaidForCredit();
        return accountingDay;
    }

    public AccountingDay getByStatus(AccountingDayStatus status) {
        return getRepository().findByStatus(status).orElseThrow(() -> new ResourceNotFoundException("Journée comptable introuvable !"));
    }

    public LocalDate getCurrentAccountingDate() {
        return getByStatus(AccountingDayStatus.OPENED).getAccountingDate();
    }

    @Transactional
    public AccountingDay closeAccountingDay() {
        final LocalDate accountingDate = getCurrentAccountingDate();
        if (!getRepository().existsByStatus(AccountingDayStatus.OPENED)) {
            throw new ApplicationException("Il n'existe aucune journée comptable ouverte !");
        }
        if (getRepository().existsByStatusAndAccountingDate(AccountingDayStatus.CLOSED, accountingDate)) {
            throw new ApplicationException("Cette Journée comptable est déjà fermée !");
        }
        if (this.dailyAccountingService.getDailyAccountancyService().isExistsOpenedCashDesk()) {
            throw new ApplicationException("Toutes les caisses ne sont pas encore fermées !");
        }
        AccountingDay accountingDay = getByStatus(AccountingDayStatus.OPENED);

        dailyAccountingService.closeDailyAccounting(accountingDate);
        accountingDay.close();
        update(accountingDay);
        return accountingDay;
    }

    @Transactional
    public DailyAccountancy closeCollectorOperation(CloseCollectorOperationDto dto) {
        return dailyAccountingService.closeCollectorOperation(dto, getCurrentAccountingDate());
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
