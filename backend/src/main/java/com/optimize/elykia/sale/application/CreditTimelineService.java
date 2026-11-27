package com.optimize.elykia.sale.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.finance.application.AccountingDayService;
import com.optimize.elykia.finance.application.DailyAccountancyService;
import com.optimize.elykia.finance.domain.DailyAccountancy;
import com.optimize.elykia.sale.api.BatchRecoveryResult;
import com.optimize.elykia.sale.api.FieldControlCreditPosting;
import com.optimize.elykia.sale.api.FieldControlRecoveryCommand;
import com.optimize.elykia.sale.api.RecordRecoveryBatchCommand;
import com.optimize.elykia.sale.api.RecordRecoveryCommand;
import com.optimize.elykia.sale.api.SaleBiAggregationPort;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.CreditTimeline;
import com.optimize.elykia.sale.domain.RecoverySource;
import com.optimize.elykia.sale.event.CreditCollectionEvent;
import com.optimize.elykia.sale.infrastructure.persistence.CreditTimelineRepository;
import com.optimize.elykia.sale.web.dto.CollectorDailyStakeDto;
import com.optimize.elykia.sale.web.dto.CreditTimelineDto;
import com.optimize.elykia.sale.web.dto.CreditTimelineMobileDto;
import com.optimize.elykia.sale.web.dto.CreditTimelineRespDto;
import com.optimize.elykia.sale.web.dto.SpecialDailyStakeDto;
import com.optimize.elykia.sale.web.dto.SpecialDailyStakeResponseDto;
import com.optimize.elykia.sale.web.mapper.CreditMapper;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

/**
 * Façade de compatibilité et service de lecture pour {@link CreditTimeline}.
 * Toutes les opérations d'écriture de recouvrement délèguent au moteur hexagonal unifié
 * {@link CreditRecoveryApplicationService} ({@link com.optimize.elykia.sale.api.CreditRecoveryUseCase}).
 */
@Service
@Transactional
@Slf4j
public class CreditTimelineService extends GenericService<CreditTimeline, Long> {

    private final CreditService creditService;
    private final DailyAccountancyService dailyAccountancyService;
    private final ApplicationEventPublisher eventPublisher;
    private final CreditRecoveryApplicationService recoveryApplicationService;

    private CreditPaymentEventService creditPaymentEventService;
    private CreditEnrichmentService creditEnrichmentService;
    private SaleBiAggregationPort biAggregationService;
    private BusinessMetricsPublisher metricsPublisher;

    @Autowired
    protected CreditTimelineService(
            CreditTimelineRepository repository,
            CreditService creditService,
            DailyAccountancyService dailyAccountancyService,
            ApplicationEventPublisher eventPublisher,
            CreditRecoveryApplicationService recoveryApplicationService) {
        super(repository);
        this.creditService = creditService;
        this.dailyAccountancyService = dailyAccountancyService;
        this.eventPublisher = eventPublisher;
        this.recoveryApplicationService = recoveryApplicationService;
    }

    /**
     * Constructeur de compatibilité pour les tests unitaires instanciant directement la façade.
     */
    protected CreditTimelineService(
            CreditTimelineRepository repository,
            CreditMapper creditMapper,
            CreditService creditService,
            ClientService clientService,
            DailyAccountancyService dailyAccountancyService,
            AccountingDayService accountingDayService,
            ApplicationEventPublisher eventPublisher,
            ClientReliquatService clientReliquatService,
            UserService userService,
            PlatformTransactionManager transactionManager) {
        this(
                repository,
                creditService,
                dailyAccountancyService,
                eventPublisher,
                new CreditRecoveryApplicationService(
                        repository,
                        creditService,
                        clientService,
                        dailyAccountancyService,
                        accountingDayService,
                        eventPublisher,
                        clientReliquatService,
                        userService,
                        transactionManager)
        );
    }

    @Autowired(required = false)
    public void setCreditPaymentEventService(CreditPaymentEventService creditPaymentEventService) {
        this.creditPaymentEventService = creditPaymentEventService;
    }

    @Autowired(required = false)
    public void setCreditEnrichmentService(CreditEnrichmentService creditEnrichmentService) {
        this.creditEnrichmentService = creditEnrichmentService;
    }

    @Autowired(required = false)
    public void setBiAggregationService(SaleBiAggregationPort biAggregationService) {
        this.biAggregationService = biAggregationService;
    }

    @Autowired(required = false)
    public void setMetricsPublisher(BusinessMetricsPublisher metricsPublisher) {
        this.metricsPublisher = metricsPublisher;
    }

    /**
     * Recouvrement unitaire (web / recovery-manager) — délègue à {@link CreditRecoveryApplicationService}.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CreditTimeline makeDailyStake(CreditTimelineDto dto) {
        RecordRecoveryCommand command = new RecordRecoveryCommand(
                dto.getCreditId(),
                dto.getAmount(),
                dto.getReference(),
                dto.getCollector(),
                dto.getReliquatGeneratedAmount(),
                dto.getReliquatUsedAmount(),
                dto.getOperationConsentCode(),
                dto.getConfirmedAmount(),
                dto.getSyncConsentCode(),
                RecoverySource.WEB_SINGLE
        );
        return recoveryApplicationService.recordRecovery(command);
    }

    void applyAutoReliquatForClosure(CreditTimelineDto dto, Credit credit) {
        if (dto == null || credit == null) {
            return;
        }
        double requestedAmount = dto.getAmount() != null ? dto.getAmount() : 0.0;
        double reliquatGenerated = dto.getReliquatGeneratedAmount() != null ? dto.getReliquatGeneratedAmount() : 0.0;
        double reliquatUsed = dto.getReliquatUsedAmount() != null ? dto.getReliquatUsedAmount() : 0.0;

        CreditRecoveryApplicationService.AutoReliquatResolution resolution =
                recoveryApplicationService.resolveAutoReliquatForClosure(
                        credit, requestedAmount, reliquatGenerated, reliquatUsed);

        if (resolution.reliquatUsed() != reliquatUsed || resolution.amount() != requestedAmount) {
            dto.setAmount(resolution.amount());
            dto.setReliquatUsedAmount(resolution.reliquatUsed());
            if (dto.getReliquatGeneratedAmount() == null) {
                dto.setReliquatGeneratedAmount(resolution.reliquatGenerated());
            }
        }
    }

    /**
     * Recouvrement initial (vente comptant / livraison tontine) dans la transaction appelante.
     */
    public void recordInitialSaleRecovery(Credit credit, CreditTimelineDto dto) {
        RecordRecoveryCommand command = new RecordRecoveryCommand(
                credit.getId(),
                dto.getAmount(),
                dto.getReference(),
                dto.getCollector(),
                dto.getReliquatGeneratedAmount(),
                dto.getReliquatUsedAmount(),
                dto.getOperationConsentCode(),
                dto.getConfirmedAmount(),
                dto.getSyncConsentCode(),
                RecoverySource.INITIAL_SALE
        );
        recoveryApplicationService.recordInitialSaleRecovery(credit, command);
    }

    /**
     * @deprecated Utiliser {@link com.optimize.elykia.sale.api.CreditRecoveryUseCase}.
     */
    @Deprecated(since = "2.17.0")
    public void dailyStakeFactor(Credit credit, CreditTimeline creditTimeline) {
        dailyStakeFactor(credit, creditTimeline, true);
    }

    /**
     * @deprecated Utiliser {@link com.optimize.elykia.sale.api.CreditRecoveryUseCase}.
     */
    @Deprecated(since = "2.17.0")
    public void dailyStakeFactor(Credit credit, CreditTimeline creditTimeline, boolean publishEvent) {
        try {
            DailyAccountancy dailyAccountancy = dailyAccountancyService.getByCollectorOrCreateNew(credit.getCollector());
            credit.checkInProgressStatus();

            creditTimeline.checkStakeValue(credit.getDailyStake());

            creditTimeline = credit.dailyStakeOperation(creditTimeline);
            creditTimeline.setDailyAccountancy(dailyAccountancy);
            if (creditTimeline.getCollector() == null) {
                creditTimeline.setCollector(credit.getCollector());
            }
            if (!StringUtils.hasText(creditTimeline.getReference())) {
                LocalDate now = LocalDate.now();
                Random random = new Random();
                int nombreAleatoire = random.nextInt();
                String hexString = String.format("%08x", nombreAleatoire & 0xFFFFFFFFL);
                creditTimeline.setReference("REC-" + now.getYear() + now.getMonthValue() + "-" + hexString);
            }
            creditService.update(credit);
            super.create(creditTimeline);
            if (CreditStatus.SETTLED.equals(credit.getStatus()) || credit.getTotalAmountRemaining() == 0) {
                creditService.syncClientCreditFlagsAfterClose(credit);
            }

            if (creditPaymentEventService != null) {
                creditPaymentEventService.recordPayment(credit, creditTimeline.getAmount(), "CASH");
            }

            if (creditEnrichmentService != null) {
                creditEnrichmentService.enrichCredit(credit);
                creditService.update(credit);
            }

            if (metricsPublisher != null) {
                metricsPublisher.collectionRecorded(credit.getCollector(), creditTimeline.getAmount());
                if (CreditStatus.SETTLED.equals(credit.getStatus())) {
                    metricsPublisher.creditSettled(credit.getCollector());
                }
            }

            if (publishEvent && eventPublisher != null) {
                String ref = credit.getReference() + " | Client : " + credit.getClient().getFullName();
                eventPublisher.publishEvent(new CreditCollectionEvent(
                        this,
                        creditTimeline.getAmount(),
                        creditTimeline.getCollector(),
                        ref,
                        creditTimeline.getReference(),
                        creditTimeline.getReliquatGeneratedAmount(),
                        creditTimeline.getReliquatUsedAmount()
                ));
            }

            if (biAggregationService != null) {
                try {
                    biAggregationService.updateCollectionAggregation(creditTimeline);
                } catch (Exception e) {
                    log.error("Échec agrégation BI pour recoveryRef={} creditId={}: {}",
                            creditTimeline.getReference(), credit.getId(), e.getMessage(), e);
                }
            }
        } catch (RuntimeException e) {
            log.error("Échec dailyStakeFactor creditId={} collector={} recoveryRef={}: {}",
                    credit.getId(), credit.getCollector(), creditTimeline.getReference(), e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Sync mobile mises normales (rétrocompatibilité) — délègue au moteur batch unifié.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public SpecialDailyStakeResponseDto defaultDailyStakeByCollector(CollectorDailyStakeDto dto) {
        List<RecordRecoveryCommand> items = dto.resolveEffectiveStakeUnits().stream()
                .map(unit -> new RecordRecoveryCommand(
                        unit.getCreditId(),
                        null,
                        unit.getRecoveryId(),
                        dto.getCollector(),
                        unit.getReliquatGeneratedAmount(),
                        unit.getReliquatUsedAmount(),
                        unit.getOperationConsentCode(),
                        unit.getConfirmedAmount(),
                        dto.getSyncConsentCode(),
                        RecoverySource.MOBILE_SYNC
                ))
                .toList();

        BatchRecoveryResult result = recoveryApplicationService.recordRecoveryBatch(
                new RecordRecoveryBatchCommand(dto.getCollector(), dto.getSyncConsentCode(), items, true));
        return toLegacyResponse(result);
    }

    /**
     * Sync mobile mises spéciales (rétrocompatibilité) — délègue au moteur batch unifié.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public SpecialDailyStakeResponseDto specialDailyStakeByCollector(SpecialDailyStakeDto dto) {
        List<RecordRecoveryCommand> items = dto.getStakeUnits() == null
                ? Collections.emptyList()
                : dto.getStakeUnits().stream()
                .map(unit -> new RecordRecoveryCommand(
                        unit.getCreditId(),
                        unit.getAmount(),
                        unit.getRecoveryId(),
                        dto.getCollector(),
                        unit.getReliquatGeneratedAmount(),
                        unit.getReliquatUsedAmount(),
                        unit.getOperationConsentCode(),
                        unit.getConfirmedAmount(),
                        dto.getSyncConsentCode(),
                        RecoverySource.MOBILE_SYNC
                ))
                .toList();

        BatchRecoveryResult result = recoveryApplicationService.recordRecoveryBatch(
                new RecordRecoveryBatchCommand(dto.getCollector(), dto.getSyncConsentCode(), items, false));
        return toLegacyResponse(result);
    }

    public FieldControlCreditPosting postFieldControlRecovery(Long creditId, double cashAmount, String reference) {
        return recoveryApplicationService.recordFieldControlRecovery(
                new FieldControlRecoveryCommand(creditId, cashAmount, reference));
    }

    public void publishFieldControlCash(FieldControlCreditPosting posting) {
        recoveryApplicationService.publishFieldControlCash(posting);
    }

    public List<CreditTimelineRespDto> getAllByCredit(Long creditId) {
        return getRepository().findRespDtosByCreditIdAndState(creditId, State.ENABLED);
    }

    public CreditTimelineRespDto cancelRecovery(Long timelineId) {
        return recoveryApplicationService.cancelRecovery(timelineId);
    }

    public void reverseCollectionsForCancelledCashSale(Credit credit) {
        recoveryApplicationService.reverseCollectionsForCancelledCashSale(credit);
    }

    public CreditTimelineRepository getRepository() {
        return (CreditTimelineRepository) repository;
    }

    public List<CreditTimeline> getLast30DaysByCollector(String collector) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyDaysAgo = now.minusDays(30);

        return getRepository()
                .findByCollectorAndCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(
                        collector,
                        thirtyDaysAgo,
                        now
                )
                .collect(Collectors.toList());
    }

    public List<CreditTimelineMobileDto> getLast30DaysMobileDtosByCollector(String collector) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyDaysAgo = now.minusDays(30);

        return getRepository().findMobileDtosByCollectorAndDateRange(collector, thirtyDaysAgo, now);
    }

    public static SpecialDailyStakeResponseDto toLegacyResponse(BatchRecoveryResult result) {
        List<SpecialDailyStakeResponseDto.FailedRecoveryDto> failed = result.failedRecoveries().stream()
                .map(f -> new SpecialDailyStakeResponseDto.FailedRecoveryDto(f.recoveryId(), f.errorMessage()))
                .toList();
        return new SpecialDailyStakeResponseDto(result.successRecoveryIds(), failed);
    }
}
