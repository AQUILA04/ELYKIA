package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.CollectorDailyStakeDto;
import com.optimize.elykia.core.dto.CreditTimelineDto;
import com.optimize.elykia.core.dto.SpecialDailyStakeDto;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.CreditTimeline;
import com.optimize.elykia.core.entity.DailyAccountancy;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.mapper.CreditMapper;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.event.CreditCollectionEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class CreditTimelineService extends GenericService<CreditTimeline, Long> {
    private final CreditMapper creditMapper;
    private final CreditService creditService;
    private final ClientService clientService;
    private final DailyAccountancyService dailyAccountancyService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private CreditPaymentEventService creditPaymentEventService;
    private CreditEnrichmentService creditEnrichmentService;
    private BiAggregationService biAggregationService;  // Added for real-time aggregation

    protected CreditTimelineService(CreditTimelineRepository repository,
            CreditMapper creditMapper,
            CreditService creditService,
            ClientService clientService,
            DailyAccountancyService dailyAccountancyService,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.creditMapper = creditMapper;
        this.creditService = creditService;
        this.clientService = clientService;
        this.dailyAccountancyService = dailyAccountancyService;
        this.eventPublisher = eventPublisher;
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

    @Transactional
    public CreditTimeline makeDailyStake(CreditTimelineDto dto) {
        CreditTimeline creditTimeline = creditMapper.toCreditTimeline(dto);
        Credit credit = creditService.getById(dto.getCreditId());
        dailyStakeFactor(credit, creditTimeline);
        return creditTimeline;
    }

    @Transactional
    public void dailyStakeFactor(Credit credit, CreditTimeline creditTimeline) {
        DailyAccountancy dailyAccountancy = dailyAccountancyService.getByCollectorOrCreateNew(credit.getCollector());
        credit.checkInProgressStatus();

        // C'est ici que se trouve l'ancienne vérification
        creditTimeline.checkStakeValue(credit.getDailyStake());

        creditTimeline = credit.dailyStakeOperation(creditTimeline);
        creditTimeline.setDailyAccountancy(dailyAccountancy);
        creditTimeline.setCollector(credit.getCollector());
        creditService.update(credit);
        create(creditTimeline);

        // === INTÉGRATION BI : Enregistrement de l'événement de paiement ===
        if (creditPaymentEventService != null) {
            creditPaymentEventService.recordPayment(credit, creditTimeline.getAmount(), "CASH");
        }

        // === INTÉGRATION BI : Mise à jour des métriques du crédit ===
        if (creditEnrichmentService != null) {
            creditEnrichmentService.enrichCredit(credit);
            creditService.update(credit);
        }

        // Publish CreditCollectionEvent
        if (eventPublisher != null) {
            String ref = credit.getReference() + " | Client : " + credit.getClient().getFullName();
            eventPublisher.publishEvent(new CreditCollectionEvent(
                    this,
                    creditTimeline.getAmount(),
                    creditTimeline.getCollector(),
                    ref,
                    creditTimeline.getReference()
            ));
        }

        // Real-time aggregation update for BI performance optimization
        if (biAggregationService != null) {
            try {
                biAggregationService.updateCollectionAggregation(creditTimeline);
            } catch (Exception e) {
                // Log error but don't fail the main payment operation
                // This ensures aggregation errors don't impact business operations
            }
        }

        if (CreditStatus.SETTLED.equals(credit.getStatus())) {
            clientService.updateCreditStatus(credit.getClientId(), Boolean.FALSE);
        }
        clientService.updateCreditStatus(credit.getClientId(), Boolean.TRUE);
    }

    @Transactional
    public List<String> defaultDailyStakeByCollector(CollectorDailyStakeDto dto) {
        List<String> successRecoveryIds = new ArrayList<>();
        dto.getStakeUnits().forEach(stakeUnit -> {
            processDailyStake(stakeUnit.getCreditId(), stakeUnit.getRecoveryId(), null, true, successRecoveryIds);
        });
        return successRecoveryIds;
    }


    @Transactional
    public List<String> specialDailyStakeByCollector(SpecialDailyStakeDto dto) {
        List<String> successRecoveryIds = new ArrayList<>();
        dto.getStakeUnits().forEach(stakeUnit -> {
            processDailyStake(stakeUnit.getCreditId(), stakeUnit.getRecoveryId(), stakeUnit.getAmount(), false, successRecoveryIds);
        });
        return successRecoveryIds;
    }

    private void processDailyStake(Long creditId, String recoveryId, Double amount, boolean isNormalStake, List<String> successRecoveryIds) {
        // Check for duplicate reference
        if (getRepository().existsByReference(recoveryId)) {
            successRecoveryIds.add(recoveryId);
            return;
        }

        creditService.getRepository()
                .findByIdAndStatus(creditId, CreditStatus.INPROGRESS)
                .ifPresent(credit -> {
                    Double stakeAmount = amount;
                    if (isNormalStake) {
                        stakeAmount = credit.getDailyStake();
                    } else {
                        // Validation for special stake
                        if (stakeAmount > credit.getTotalAmountRemaining()) {
                            throw new CustomValidationException(
                                    "Le montant de la mise spéciale ne peut pas dépasser le montant restant à payer !");
                        }
                    }

                    CreditTimeline creditTimeline = new CreditTimeline();
                    creditTimeline.setCredit(credit);
                    creditTimeline.setCollector(credit.getCollector());
                    creditTimeline.setNormalStake(isNormalStake);
                    creditTimeline.setAmount(stakeAmount);
                    creditTimeline.setReference(recoveryId);
                    dailyStakeFactor(credit, creditTimeline);
                    successRecoveryIds.add(recoveryId);
                });
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
                .collect(java.util.stream.Collectors.toList());
    }
}
