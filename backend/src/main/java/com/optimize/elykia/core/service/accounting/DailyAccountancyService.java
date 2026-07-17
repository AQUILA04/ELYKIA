package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.CloseCollectorOperationDto;
import com.optimize.elykia.core.dto.TicketingDto;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import com.optimize.elykia.core.entity.accounting.DailyAccounting;
import com.optimize.elykia.core.enumaration.PeriodState;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.DailyAccountancyRepository;
import com.optimize.elykia.core.repository.DailyAccountingRepository;
import com.optimize.elykia.core.util.ReportPeriod;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
@Slf4j
public class DailyAccountancyService extends GenericService<DailyAccountancy, Long> {
    private final CreditTimelineRepository creditTimelineRepository;
    private final UserService userService;
    private final DailyAccountingRepository dailyAccountingRepository;

    protected DailyAccountancyService(DailyAccountancyRepository repository,
                                      CreditTimelineRepository creditTimelineRepository,
                                      UserService userService,
                                      DailyAccountingRepository dailyAccountingRepository
    ) {
        super(repository);
        this.creditTimelineRepository = creditTimelineRepository;
        this.userService = userService;
        this.dailyAccountingRepository = dailyAccountingRepository;
    }

    @Transactional
    @Deprecated
    public void makeDailyAccountancy(List<String> collectors, LocalDate accountingDate, DailyAccounting dailyAccounting) {
        collectors.forEach(collector -> {
            DailyAccountancy dailyAccountancy = new DailyAccountancy();
            dailyAccountancy.setCollector(collector);
            dailyAccountancy.setAccountingDate(accountingDate);
            dailyAccountancy.setDailyAccounting(dailyAccounting);
            Double balance = creditTimelineRepository.sumAmountByCollectorAndDate(collector, accountingDate.atStartOfDay(), accountingDate.atTime(23, 59, 59));
            dailyAccountancy.setSystemBalance(Objects.nonNull(balance) ? balance : 0.0);
            create(dailyAccountancy);
        });
    }

    @Transactional
    @Deprecated
    public DailyAccountancy finishedCollectorOperation(CloseCollectorOperationDto dto) {
        DailyAccountancy dailyAccountancy = new DailyAccountancy();
        Double balance = creditTimelineRepository.sumAmountByCollectorAndDate(dto.getCollector(), LocalDate.now().atStartOfDay(), LocalDate.now().atTime(23, 59, 59));
        dailyAccountancy.setSystemBalance(Objects.nonNull(balance) ? balance : 0.0);
        dailyAccountancy.setRealBalance(dto.getRealTotalAmount());
        dailyAccountancy.setCollector(dto.getCollector());
        dailyAccountancy.setAccountingDate(dto.getAccountingDate());
        dailyAccountancy.setDailyAccounting(dto.getDailyAccounting());
        return create(dailyAccountancy);
    }

    public Page<DailyAccountancy> getAllByDailyAccounting(Long dailyAccountingId, Pageable pageable) {
        return getRepository().findByDailyAccounting_idOrderByCollectorAsc(dailyAccountingId, pageable);
    }

    @Transactional
    public DailyAccountancy initPromoterDailyAccountancy() {

        User user = userService.getCurrentUser();
        if (isOpenCashDesk()) {
            throw new ApplicationException("Une caisse ouverte existe déjà pour l'utilisateur: " + user.getUsername());
        }
        if (!user.is(UserProfilConstant.PROMOTER)){
            throw new ApplicationException("Impossible d'ouvrir la caisse pour un utilisateur non commercial : " + user.getUsername());

        }
        DailyAccountancy accountancy = new DailyAccountancy();
        accountancy.setCollector(user.getUsername());
        //DailyAccounting dailyAccounting = dailyAccountingRepository.getCurrentDailyAccounting();
        //accountancy.setDailyAccounting(dailyAccounting);
        accountancy.setAccountingDate(LocalDate.now());
        super.create(accountancy);
        return accountancy;
    }

    @Transactional
    public boolean closeCashDesk() {
        User user = userService.getCurrentUser();
        DailyAccountancy dailyAccountancy = getByCollector(user.getUsername(), Boolean.TRUE);
        dailyAccountancy.setIsOpened(Boolean.FALSE);
        update(dailyAccountancy);
        return Boolean.TRUE;
    }

    public boolean isOpenCashDesk() {
        User user = userService.getCurrentUser();
        return !getRepository().findByAccountingDateAndCollectorAndIsOpened(LocalDate.now(), user.getUsername(), Boolean.TRUE).isEmpty();
    }

    @Transactional
    public DailyAccountancy ticketing(TicketingDto ticketingDto) {
        DailyAccountancy dailyAccountancy = getByCollector(ticketingDto.getCollector(), Boolean.TRUE);
        dailyAccountancy.setRealBalance(ticketingDto.getTotalAmount());
        dailyAccountancy.setSystemBalance(creditTimelineRepository.sumAmountByDailyAccountancyId(dailyAccountancy.getId()));
        dailyAccountancy.setTicketingJson(ticketingDto.getTicketingJson());
        dailyAccountancy.setUp();
        return repository.saveAndFlush(dailyAccountancy);
    }

    public DailyAccountancy getByCollector (String username, Boolean isOpened ) {
        return getRepository().findByAccountingDateAndCollectorAndIsOpened(LocalDate.now(), username, isOpened).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("La caisse n'existe pas pour l'utilisateur: " + username));
    }

    @Transactional
    public DailyAccountancy getByCollectorOrCreateNew (String username) {
        try {
            DailyAccounting dailyAccounting = dailyAccountingRepository.getCurrentDailyAccounting();
            LocalDate accountingDate = dailyAccounting.getAccountingDate();
            return getRepository().findByAccountingDateAndCollectorAndIsOpened(accountingDate, username, Boolean.TRUE).stream().findFirst().orElseGet(() -> {
                log.info("Ouverture caisse collector={} pour journée comptable {}", username, accountingDate);
                DailyAccountancy dailyAccountancy = new DailyAccountancy();
                dailyAccountancy.setCollector(username);
                dailyAccountancy.setDailyAccounting(dailyAccounting);
                dailyAccountancy.setAccountingDate(accountingDate);

                return create(dailyAccountancy);
            });
        } catch (RuntimeException e) {
            log.error("Échec getByCollectorOrCreateNew collector={}: {}", username, e.getMessage(), e);
            throw e;
        }
    }

    public boolean isExistsOpenedCashDesk () {
        return getRepository().existsByIsOpenedIsTrue();
    }

    public List<DailyAccountancy> getOpenCashDesks() {
        return getRepository().findAllByIsOpenedIsTrue();
    }

    public List<DailyAccountancy> getCollectorAccountancyByPeriod(PeriodState period, String collector) {
        ReportPeriod reportPeriod = ReportPeriod.from(period);
        return getRepository()
                .findByAccountingDateGreaterThanEqualAndAccountingDateLessThanEqualAndCollector(reportPeriod.getDateFrom(),
                        reportPeriod.getDateTo(), collector);
    }


    @Override
    public DailyAccountancyRepository getRepository() {
        return (DailyAccountancyRepository) super.getRepository();
    }
}
