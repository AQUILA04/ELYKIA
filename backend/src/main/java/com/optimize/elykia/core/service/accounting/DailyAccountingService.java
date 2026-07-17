package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.CloseCollectorOperationDto;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import com.optimize.elykia.core.entity.accounting.DailyAccounting;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.DailyAccountingRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
@Slf4j
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
        ensureCurrentRecordForDate(accountingDate);
    }

    /**
     * Garantit un unique {@link DailyAccounting} au statut {@code CURRENT} pour la date donnée.
     * Répare les états partiels (CURRENT orphelin, ligne OLD réutilisable) sans boucle.
     */
    @Transactional
    public DailyAccounting ensureCurrentRecordForDate(LocalDate accountingDate) {
        Optional<DailyAccounting> currentOpt = getRepository().findByStatus(AccountingDayStatus.CURRENT);
        if (currentOpt.isPresent()) {
            DailyAccounting current = currentOpt.get();
            if (accountingDate.equals(current.getAccountingDate())) {
                return current;
            }
            log.warn("DailyAccounting CURRENT orphelin pour {} (attendu {}) → passage en OLD",
                    current.getAccountingDate(), accountingDate);
            current.setStatus(AccountingDayStatus.OLD);
            update(current);
        }

        DailyAccounting byDate = getByAccountingDate(accountingDate);
        if (byDate != null) {
            if (byDate.getStatus() != AccountingDayStatus.CURRENT) {
                byDate.setStatus(AccountingDayStatus.CURRENT);
                log.info("DailyAccounting {} réactivé en CURRENT", accountingDate);
                return update(byDate);
            }
            return byDate;
        }

        DailyAccounting created = new DailyAccounting();
        created.setAccountingDate(accountingDate);
        created.setStatus(AccountingDayStatus.CURRENT);
        log.info("DailyAccounting CURRENT créé pour {}", accountingDate);
        return create(created);
    }

    @Transactional
    public DailyAccounting closeDailyAccounting(List<String> collectors, LocalDate accountingDate) {
        DailyAccounting dailyAccounting = getByAccountingDate(accountingDate);
        dailyAccounting.setTotalAmount(creditTimelineRepository.sumAmountByDate(
                accountingDate.atStartOfDay(), accountingDate.atTime(23, 59, 59)));
        update(dailyAccounting);
        dailyAccountancyService.makeDailyAccountancy(collectors, accountingDate, dailyAccounting);
        return getByAccountingDate(accountingDate);
    }

    @Transactional
    public DailyAccounting closeDailyAccounting(LocalDate accountingDate) {
        DailyAccounting dailyAccounting = getByAccountingDate(accountingDate);
        if (Objects.isNull(dailyAccounting)) {
            // Fallback : fermer le CURRENT même si la date ne correspond pas (état partiel après bascule)
            dailyAccounting = getRepository().findByStatus(AccountingDayStatus.CURRENT).orElse(null);
            if (Objects.isNull(dailyAccounting)) {
                return null;
            }
            log.warn("Fermeture DailyAccounting CURRENT {} sans ligne pour la date {}",
                    dailyAccounting.getAccountingDate(), accountingDate);
        }
        dailyAccounting.setTotalAmount(creditTimelineRepository.sumAmountByDate(
                accountingDate.atStartOfDay(), accountingDate.atTime(23, 59, 59)));
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

    public boolean hasCurrentForDate(LocalDate accountingDate) {
        return getRepository().findByStatus(AccountingDayStatus.CURRENT)
                .filter(da -> accountingDate.equals(da.getAccountingDate()))
                .isPresent();
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
