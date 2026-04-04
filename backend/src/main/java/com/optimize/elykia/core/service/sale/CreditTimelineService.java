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
import com.optimize.elykia.core.service.accounting.DailyAccountancyService;
import com.optimize.elykia.core.service.bi.BiAggregationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
        if (StringUtils.hasText(creditTimeline.getReference())) {
            LocalDate now = LocalDate.now();
            Random random = new Random();
            int nombreAleatoire = random.nextInt();
            String hexString = String.format("%08x", nombreAleatoire & 0xFFFFFFFFL);
            creditTimeline.setReference("REC-"+ now.getYear() + now.getMonthValue()+ "-" + hexString);
        }
        creditService.update(credit);
        create(creditTimeline);
        if (CreditStatus.SETTLED.equals(credit.getStatus()) || credit.getTotalAmountRemaining() == 0) {
            clientService.updateCreditStatus(credit.getClientId(), Boolean.FALSE);
        }


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

    }

    @Transactional
    public SpecialDailyStakeResponseDto defaultDailyStakeByCollector(CollectorDailyStakeDto dto) {
        List<String> successRecoveryIds = new ArrayList<>();
        List<SpecialDailyStakeResponseDto.FailedRecoveryDto> failedRecoveries = new ArrayList<>();
        dto.getStakeUnits().forEach(stakeUnit -> {
            try {
            processDailyStake(stakeUnit.getCreditId(), stakeUnit.getRecoveryId(), null, true, successRecoveryIds, false);
            } catch (Exception e) {
                failedRecoveries.add(new SpecialDailyStakeResponseDto.FailedRecoveryDto(stakeUnit.getRecoveryId(), e.getMessage()));
            }
        });
        failedRecoveries.forEach(failure -> log.error("Échec de la mise quotidienne pour Recovery ID: {}. Erreur: {}", failure.getRecoveryId(), failure.getErrorMessage()));

        return new SpecialDailyStakeResponseDto(successRecoveryIds, failedRecoveries);
    }


    @Transactional
    public SpecialDailyStakeResponseDto specialDailyStakeByCollector(SpecialDailyStakeDto dto) {
        List<String> successRecoveryIds = new ArrayList<>();
        List<SpecialDailyStakeResponseDto.FailedRecoveryDto> failedRecoveries = new ArrayList<>();

        dto.getStakeUnits().forEach(stakeUnit -> {
            try {
                processDailyStake(stakeUnit.getCreditId(), stakeUnit.getRecoveryId(), stakeUnit.getAmount(), false, successRecoveryIds, true);
            } catch (Exception e) {
                failedRecoveries.add(new SpecialDailyStakeResponseDto.FailedRecoveryDto(stakeUnit.getRecoveryId(), e.getMessage()));
            }
        });
        return new SpecialDailyStakeResponseDto(successRecoveryIds, failedRecoveries);
    }

    private void processDailyStake(Long creditId, String recoveryId, Double amount, boolean isNormalStake, List<String> successRecoveryIds, boolean throwOnNotFound) {
        // Check for duplicate reference
        if (getRepository().existsByReference(recoveryId)) {
            successRecoveryIds.add(recoveryId);
            return;
        }

        Optional<Credit> creditOptional = creditService.getRepository().findByIdAndStatus(creditId, CreditStatus.INPROGRESS);

        if (!creditOptional.isPresent()) {
            if (throwOnNotFound) {
                throw new CustomValidationException("Crédit introuvable ou statut incorrect pour l'ID: " + creditId);
            }
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
        dailyStakeFactor(credit, creditTimeline);
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
