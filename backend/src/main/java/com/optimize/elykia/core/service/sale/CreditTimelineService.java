package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.CollectorDailyStakeDto;
import com.optimize.elykia.core.dto.CreditTimelineDto;
import com.optimize.elykia.core.dto.CreditTimelineMobileDto;
import com.optimize.elykia.core.dto.SpecialDailyStakeDto;
import com.optimize.elykia.core.dto.SpecialDailyStakeResponseDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.event.CreditCollectionEvent;
import com.optimize.elykia.core.mapper.CreditMapper;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.service.accounting.DailyAccountancyService;
import com.optimize.elykia.core.service.bi.BiAggregationService;
import com.optimize.elykia.core.monitoring.BusinessMetricsPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class CreditTimelineService extends GenericService<CreditTimeline, Long> {
    private final CreditMapper creditMapper;
    private final CreditService creditService;
    private final ClientService clientService;
    private final DailyAccountancyService dailyAccountancyService;
    private final AccountingDayService accountingDayService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final ClientReliquatService clientReliquatService;
    private final TransactionTemplate requiresNewTransactionTemplate;
    private CreditPaymentEventService creditPaymentEventService;
    private CreditEnrichmentService creditEnrichmentService;
    private BiAggregationService biAggregationService;
    private BusinessMetricsPublisher metricsPublisher;

    protected CreditTimelineService(CreditTimelineRepository repository,
            CreditMapper creditMapper,
            CreditService creditService,
            ClientService clientService,
            DailyAccountancyService dailyAccountancyService,
            AccountingDayService accountingDayService,
            org.springframework.context.ApplicationEventPublisher eventPublisher,
            ClientReliquatService clientReliquatService,
            PlatformTransactionManager transactionManager) {
        super(repository);
        this.creditMapper = creditMapper;
        this.creditService = creditService;
        this.clientService = clientService;
        this.dailyAccountancyService = dailyAccountancyService;
        this.accountingDayService = accountingDayService;
        this.eventPublisher = eventPublisher;
        this.clientReliquatService = clientReliquatService;
        this.requiresNewTransactionTemplate = new TransactionTemplate(transactionManager);
        this.requiresNewTransactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setCreditPaymentEventService(CreditPaymentEventService creditPaymentEventService) {
        this.creditPaymentEventService = creditPaymentEventService;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setCreditEnrichmentService(CreditEnrichmentService creditEnrichmentService) {
        this.creditEnrichmentService = creditEnrichmentService;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setBiAggregationService(BiAggregationService biAggregationService) {
        this.biAggregationService = biAggregationService;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setMetricsPublisher(BusinessMetricsPublisher metricsPublisher) {
        this.metricsPublisher = metricsPublisher;
    }

    /**
     * Recouvrement unitaire (web / recovery-manager).
     * Prépare la journée comptable HORS transaction JPA, puis exécute la mise en REQUIRES_NEW
     * pour éviter "Could not open JPA EntityManager" (suspend NOT_SUPPORTED au milieu d'une TX).
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CreditTimeline makeDailyStake(CreditTimelineDto dto) {
        try {
            if (StringUtils.hasText(dto.getReference()) && getRepository().existsByReference(dto.getReference())) {
                return getRepository().findByReference(dto.getReference()).orElseThrow();
            }
            ensureAccountingReadyOrFail("makeDailyStake");
            return requiresNewTransactionTemplate.execute(status -> doMakeDailyStake(dto));
        } catch (RuntimeException e) {
            log.error("Échec recouvrement web creditId={} reference={}: {}",
                    dto.getCreditId(), dto.getReference(), e.getMessage(), e);
            throw e;
        }
    }

    private CreditTimeline doMakeDailyStake(CreditTimelineDto dto) {
        CreditTimeline creditTimeline = creditMapper.toCreditTimeline(dto);
        Credit credit = creditService.getById(dto.getCreditId());
        dailyStakeFactor(credit, creditTimeline);
        return creditTimeline;
    }

    /**
     * Enregistre la mise. Prérequis : journée comptable + DailyAccounting CURRENT déjà prêts
     * (appeler {@link AccountingDayService#ensureAccountingReadyForOperations()} avant d'ouvrir la TX métier).
     */
    public void dailyStakeFactor(Credit credit, CreditTimeline creditTimeline) {
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
                creditTimeline.setReference("REC-"+ now.getYear() + now.getMonthValue()+ "-" + hexString);
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

            if (eventPublisher != null) {
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
     * Sync mobile mises normales : chaque mise dans sa propre transaction (REQUIRES_NEW)
     * pour éviter UnexpectedRollbackException quand une unité échoue dans le lot.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public SpecialDailyStakeResponseDto defaultDailyStakeByCollector(CollectorDailyStakeDto dto) {
        ensureAccountingReadyOrFail("defaultDailyStake");
        List<String> successRecoveryIds = new ArrayList<>();
        List<SpecialDailyStakeResponseDto.FailedRecoveryDto> failedRecoveries = new ArrayList<>();
        dto.getStakeUnits().forEach(stakeUnit -> {
            try {
                requiresNewTransactionTemplate.executeWithoutResult(status ->
                        processDailyStake(stakeUnit.getCreditId(), stakeUnit.getRecoveryId(), null, true,
                                successRecoveryIds, false, stakeUnit.getReliquatGeneratedAmount(),
                                stakeUnit.getReliquatUsedAmount(), stakeUnit.getOperationConsentCode(),
                                stakeUnit.getConfirmedAmount(), dto.getSyncConsentCode()));
            } catch (Exception e) {
                log.error("Échec mise quotidienne (sync) recoveryId={} creditId={}: {}",
                        stakeUnit.getRecoveryId(), stakeUnit.getCreditId(), e.getMessage(), e);
                failedRecoveries.add(new SpecialDailyStakeResponseDto.FailedRecoveryDto(
                        stakeUnit.getRecoveryId(), rootMessage(e)));
            }
        });
        return new SpecialDailyStakeResponseDto(successRecoveryIds, failedRecoveries);
    }

    /**
     * Sync mobile mises spéciales : chaque mise dans sa propre transaction (REQUIRES_NEW).
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public SpecialDailyStakeResponseDto specialDailyStakeByCollector(SpecialDailyStakeDto dto) {
        ensureAccountingReadyOrFail("specialDailyStake");
        List<String> successRecoveryIds = new ArrayList<>();
        List<SpecialDailyStakeResponseDto.FailedRecoveryDto> failedRecoveries = new ArrayList<>();

        dto.getStakeUnits().forEach(stakeUnit -> {
            try {
                requiresNewTransactionTemplate.executeWithoutResult(status ->
                        processDailyStake(stakeUnit.getCreditId(), stakeUnit.getRecoveryId(), stakeUnit.getAmount(),
                                false, successRecoveryIds, true, stakeUnit.getReliquatGeneratedAmount(),
                                stakeUnit.getReliquatUsedAmount(), stakeUnit.getOperationConsentCode(),
                                stakeUnit.getConfirmedAmount(), dto.getSyncConsentCode()));
            } catch (Exception e) {
                log.error("Échec mise spéciale (sync) recoveryId={} creditId={} amount={}: {}",
                        stakeUnit.getRecoveryId(), stakeUnit.getCreditId(), stakeUnit.getAmount(), e.getMessage(), e);
                failedRecoveries.add(new SpecialDailyStakeResponseDto.FailedRecoveryDto(
                        stakeUnit.getRecoveryId(), rootMessage(e)));
            }
        });
        return new SpecialDailyStakeResponseDto(successRecoveryIds, failedRecoveries);
    }

    private void ensureAccountingReadyOrFail(String context) {
        try {
            LocalDate date = accountingDayService.ensureAccountingReadyForOperations();
            log.info("Journée comptable prête ({}) : {}", context, date);
        } catch (RuntimeException e) {
            log.error("Impossible de préparer la journée comptable ({}): {}", context, e.getMessage(), e);
            throw e;
        }
    }

    private static String rootMessage(Throwable e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        return root.getMessage() != null ? root.getMessage() : e.toString();
    }

    private void processDailyStake(Long creditId, String recoveryId, Double amount, boolean isNormalStake, List<String> successRecoveryIds, boolean throwOnNotFound, Double reliquatGenerated, Double reliquatUsed, String operationConsentCode, Double confirmedAmount, String syncConsentCode) {
        if (getRepository().existsByReference(recoveryId)) {
            successRecoveryIds.add(recoveryId);
            return;
        }

        Optional<Credit> creditOptional = creditService.getRepository().findByIdAndStatus(creditId, CreditStatus.INPROGRESS);

        if (!creditOptional.isPresent()) {
            if (metricsPublisher != null) {
                metricsPublisher.collectionFailed("unknown", "CREDIT_NOT_FOUND");
            }
            if (throwOnNotFound) {
                throw new CustomValidationException("Crédit introuvable ou statut incorrect pour l'ID: " + creditId);
            }
            log.warn("Mise ignorée : crédit introuvable ou non INPROGRESS id={} recoveryId={}", creditId, recoveryId);
            return;
        }

        Credit credit = creditOptional.get();
        Double stakeAmount = amount;
        if (isNormalStake) {
            stakeAmount = credit.getDailyStake();
        }
        if (stakeAmount > credit.getTotalAmountRemaining()) {
                throw new CustomValidationException(
                        "Le montant de la mise spéciale ne peut pas dépasser le montant restant à payer ! Ref: " + credit.getReference() + " Montant restant: " + credit.getTotalAmountRemaining() + " Montant mise: " + stakeAmount);
        }


        CreditTimeline creditTimeline = new CreditTimeline();
        creditTimeline.setCredit(credit);
        creditTimeline.setCollector(credit.getCollector());
        creditTimeline.setNormalStake(isNormalStake);
        creditTimeline.setAmount(stakeAmount);
        creditTimeline.setReference(recoveryId);
        creditTimeline.setReliquatGeneratedAmount(reliquatGenerated != null ? reliquatGenerated : 0.0);
        creditTimeline.setReliquatUsedAmount(reliquatUsed != null ? reliquatUsed : 0.0);
        creditTimeline.setOperationConsentCode(operationConsentCode);
        creditTimeline.setConfirmedAmount(confirmedAmount);
        creditTimeline.setSyncConsentCode(syncConsentCode);
        
        dailyStakeFactor(credit, creditTimeline);

        if (reliquatGenerated != null && reliquatGenerated > 0) {
            clientReliquatService.addReliquat(credit.getClientId(), reliquatGenerated, recoveryId, null);
        }
        if (reliquatUsed != null && reliquatUsed > 0) {
            clientReliquatService.consumeReliquat(credit.getClientId(), reliquatUsed, recoveryId, null);
        }

        successRecoveryIds.add(recoveryId);
    }

    public List<CreditTimeline> getAllByCredit(Long creditId) {
        return getRepository().findByCredit_id(creditId);
    }

    public CreditTimelineRepository getRepository() {
        return (CreditTimelineRepository) repository;
    }

    /**
     * Récupère les CreditTimeline des 30 derniers jours pour un collector
     * Utilisé par l'application mobile pour l'initialisation
     * @param collector Username du collector
     * @return Liste des CreditTimeline des 30 derniers jours
     */
    public List<CreditTimeline> getLast30DaysByCollector(String collector) {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime thirtyDaysAgo = now.minusDays(30);
        
        return getRepository()
                .findByCollectorAndCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(
                        collector, 
                        thirtyDaysAgo, 
                        now
                )
                .collect(Collectors.toList());
    }

    /**
     * Récupère les CreditTimelineMobileDto des 30 derniers jours pour un collector
     * Optimisé avec une requête JPQL directe
     * @param collector Username du collector
     * @return Liste des CreditTimelineMobileDto
     */
    public List<CreditTimelineMobileDto> getLast30DaysMobileDtosByCollector(String collector) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyDaysAgo = now.minusDays(30);

        return getRepository().findMobileDtosByCollectorAndDateRange(collector, thirtyDaysAgo, now);
    }
}
