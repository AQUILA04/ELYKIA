package com.optimize.elykia.core.service.accounting;

import com.optimize.elykia.core.dto.CloseCollectorOperationDto;
import com.optimize.elykia.core.entity.accounting.AccountingDay;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import com.optimize.elykia.core.entity.accounting.DailyAccounting;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.repository.AccountingDayRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Étapes d'écriture de la bascule comptable, chacune dans sa propre transaction
 * pour éviter l'accumulation d'entités Credit dans le contexte Hibernate
 * (auto-flush catastrophique sur les requêtes natives de somme).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountingDayStepExecutor {

    private final AccountingDayRepository accountingDayRepository;
    private final DailyAccountingService dailyAccountingService;
    private final DailyAccountancyService dailyAccountancyService;
    private final CreditRepository creditRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<AccountingDay> findOpenedAccountingDay() {
        return accountingDayRepository.findByStatus(AccountingDayStatus.OPENED);
    }

    /**
     * Fast-path lecture seule : journée OPENED à jour + DailyAccounting CURRENT aligné.
     * Aucune écriture — utilisé pour éviter un verrou/bascule sur chaque recouvrement.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<LocalDate> findReadyAccountingDate() {
        Optional<AccountingDay> opened = accountingDayRepository.findByStatus(AccountingDayStatus.OPENED);
        if (opened.isEmpty()) {
            return Optional.empty();
        }
        LocalDate accountingDate = opened.get().getAccountingDate();
        if (accountingDate.isBefore(LocalDate.now())) {
            return Optional.empty();
        }
        if (!dailyAccountingService.hasCurrentForDate(accountingDate)) {
            return Optional.empty();
        }
        return Optional.of(accountingDate);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public DailyAccounting ensureCurrentDailyAccountingRecord(LocalDate accountingDate) {
        return dailyAccountingService.ensureCurrentRecordForDate(accountingDate);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public boolean existsClosedAccountingDayForDate(LocalDate accountingDate) {
        return accountingDayRepository.existsByStatusAndAccountingDate(AccountingDayStatus.CLOSED, accountingDate);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<AccountingDay> findAccountingDayById(Long accountingDayId) {
        return accountingDayRepository.findById(accountingDayId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public List<DailyAccountancy> findOpenCashDesks() {
        return dailyAccountancyService.getOpenCashDesks();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public boolean hasOpenCashDesks() {
        return dailyAccountancyService.isExistsOpenedCashDesk();
    }

    /**
     * Fermeture bulk de toutes les caisses ouvertes — un seul UPDATE SQL,
     * pour éviter timeout/CPU sur des centaines de milliers de lignes.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int closeAllOpenCashDesksBulk() {
        return dailyAccountancyService.closeAllOpenCashDesksBulk();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void closeOpenCashDesk(CloseCollectorOperationDto dto, LocalDate accountingDate) {
        dailyAccountingService.closeCollectorOperation(dto, accountingDate);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void closeDailyAccountingRecord(LocalDate accountingDate) {
        dailyAccountingService.closeDailyAccounting(accountingDate);
    }

    /** Ferme le DailyAccounting CURRENT s'il existe (une seule fois, pas par caisse). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void closeCurrentDailyAccountingIfPresent() {
        dailyAccountingService.getRepository().findByStatus(AccountingDayStatus.CURRENT).ifPresent(current -> {
            log.info("Fermeture DailyAccounting CURRENT orphelin pour {}", current.getAccountingDate());
            dailyAccountingService.closeDailyAccounting(current.getAccountingDate());
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AccountingDay createAndOpenAccountingDay(LocalDate accountingDate) {
        AccountingDay accountingDay = new AccountingDay();
        accountingDay.setAccountingDate(accountingDate);
        accountingDay = accountingDayRepository.save(accountingDay);
        dailyAccountingService.initDailyAccounting(accountingDate);
        int dailyPaidReset = creditRepository.updateDailyPaidForCredit();
        if (dailyPaidReset > 0) {
            log.info("Ouverture journée comptable {}: {} crédit(s) remis à dailyPaid=false", accountingDate, dailyPaidReset);
        }
        return accountingDay;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void finalizeClosedAccountingDay(Long accountingDayId) {
        AccountingDay accountingDay = accountingDayRepository.findById(accountingDayId)
                .orElseThrow();
        accountingDay.close();
        accountingDayRepository.save(accountingDay);
    }
}
