package com.optimize.elykia.core.service.accounting;

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
        if (getRepository().existsByStatus(AccountingDayStatus.OPENED)) {
            return getByStatus(AccountingDayStatus.OPENED);
        }
        AccountingDay accountingDay = new AccountingDay();
        accountingDay.setAccountingDate(LocalDate.now());
        while (getRepository().existsByStatusAndAccountingDate(AccountingDayStatus.CLOSED, accountingDay.getAccountingDate())) {
            accountingDay.setAccountingDate(accountingDay.getAccountingDate().plusDays(1));
        }

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

    public AccountingDay getByStatus(AccountingDayStatus status) {
        return getRepository().findByStatus(status).orElseThrow(() -> new ResourceNotFoundException("Journée comptable introuvable !"));
    }

    @Transactional
    public LocalDate getCurrentAccountingDate() {
        Optional<AccountingDay> optionalAccountingDay = getRepository().findByStatus(AccountingDayStatus.OPENED);
        if (optionalAccountingDay.isPresent()) {
            AccountingDay accountingDay = optionalAccountingDay.get();
            if (accountingDay.getAccountingDate().isBefore(LocalDate.now())) {
                closeAccountingDay();
                return openAccountingDay().getAccountingDate();
            }
            return accountingDay.getAccountingDate();
        }
        return openAccountingDay().getAccountingDate();
    }

    @Transactional
    public AccountingDay closeAccountingDay() {
        final LocalDate accountingDate = getByStatus(AccountingDayStatus.OPENED).getAccountingDate();
        if (getRepository().existsByStatusAndAccountingDate(AccountingDayStatus.CLOSED, accountingDate)) {
            return null;
        }
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
