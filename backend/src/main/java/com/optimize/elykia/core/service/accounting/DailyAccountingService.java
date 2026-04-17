package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.CloseCollectorOperationDto;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import com.optimize.elykia.core.entity.accounting.DailyAccounting;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.DailyAccountingRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class DailyAccountingService extends GenericService<DailyAccounting, Long> {
    private final CreditTimelineRepository creditTimelineRepository;
    private final DailyAccountancyService dailyAccountancyService;

    protected DailyAccountingService(DailyAccountingRepository repository,
                                     CreditTimelineRepository creditTimelineRepository,
                                     DailyAccountancyService dailyAccountancyService) {
        super(repository);
        this.creditTimelineRepository = creditTimelineRepository;
        this.dailyAccountancyService = dailyAccountancyService;
    }

    @Transactional
    public void initDailyAccounting(LocalDate accountingDate) {
        DailyAccounting dailyAccounting = new DailyAccounting();
        dailyAccounting.setAccountingDate(accountingDate);
        if (getRepository().existsByStatus(AccountingDayStatus.CURRENT)) {
            throw new ApplicationException("L'ancienne journée ouverte n'a pas été fermé correctement");
        }
        create(dailyAccounting);
    }

    @Transactional
    public DailyAccounting closeDailyAccounting(List<String> collectors, LocalDate accountingDate) {
        DailyAccounting dailyAccounting = getByAccountingDate(accountingDate);
        dailyAccounting.setTotalAmount(creditTimelineRepository.sumAmountByCreatedDateBetween(accountingDate.atStartOfDay(), accountingDate.atTime(23, 59)));
        update(dailyAccounting);
        dailyAccountancyService.makeDailyAccountancy(collectors, accountingDate, dailyAccounting);
        return getByAccountingDate(accountingDate);
    }

    @Transactional
    public DailyAccounting closeDailyAccounting(LocalDate accountingDate) {
        DailyAccounting dailyAccounting = getByAccountingDate(accountingDate);
        if (Objects.isNull(dailyAccounting)) {
            return null;
        }
        dailyAccounting.setTotalAmount(creditTimelineRepository.sumAmountByDate(accountingDate.atStartOfDay(), accountingDate.atTime(23, 59)));
        dailyAccounting.setStatus(AccountingDayStatus.OLD);
        return update(dailyAccounting);
    }

    public DailyAccounting getByAccountingDate(LocalDate accountingDate) {
        return ((DailyAccountingRepository) repository).findByAccountingDate(accountingDate).orElse(null);
    }

    public Page<DailyAccountancy> getDailyAccountingDetails(Long dailyAccountingId, Pageable pageable) {
        return dailyAccountancyService.getAllByDailyAccounting(dailyAccountingId, pageable);
    }

    public DailyAccounting getCurrentDailyAccounting() {
        return getRepository().findByStatus(AccountingDayStatus.CURRENT)
                .orElseThrow(() -> new ResourceNotFoundException("Aucune comptabilisation journalière n'a été trouvée !"));
    }

    @Transactional
    public DailyAccountancy closeCollectorOperation(CloseCollectorOperationDto dto, LocalDate accountingDate) {
        dto.setDailyAccounting(getByAccountingDate(accountingDate));
        dto.setAccountingDate(accountingDate);
        return dailyAccountancyService.finishedCollectorOperation(dto);
    }

    @Override
    public DailyAccountingRepository getRepository() {
        return (DailyAccountingRepository) super.getRepository();
    }

    public DailyAccountancyService getDailyAccountancyService() {
        return dailyAccountancyService;
    }
}
