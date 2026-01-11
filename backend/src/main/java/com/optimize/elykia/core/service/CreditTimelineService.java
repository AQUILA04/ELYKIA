package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.CustomValidationException; // Assurez-vous que cet import est présent
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

    @Transactional
    public CreditTimeline makeDailyStake(CreditTimelineDto dto) {
        CreditTimeline creditTimeline = creditMapper.toCreditTimeline(dto);
        Credit credit = creditService.getById(dto.getCreditId());
        dailyStakeFactor(credit, creditTimeline);
        return creditTimeline;
    }

    @Transactional
    public void dailyStakeFactor(Credit credit, CreditTimeline creditTimeline) {
        DailyAccountancy dailyAccountancy = dailyAccountancyService.getByCollector(credit.getCollector(), Boolean.TRUE);
        credit.checkInProgressStatus();

        // C'est ici que se trouve l'ancienne vérification
        creditTimeline.checkStakeValue(credit.getDailyStake());

        creditTimeline = credit.dailyStakeOperation(creditTimeline);
        creditTimeline.setDailyAccountancy(dailyAccountancy);
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
            eventPublisher.publishEvent(new CreditCollectionEvent(
                    this,
                    creditTimeline.getAmount(),
                    creditTimeline.getCollector()));
        }

        if (CreditStatus.SETTLED.equals(credit.getStatus())) {
            clientService.updateCreditStatus(credit.getClientId(), Boolean.FALSE);
        }
        clientService.updateCreditStatus(credit.getClientId(), Boolean.TRUE);
    }

    @Transactional
    public List<Long> defaultDailyStakeByCollector(CollectorDailyStakeDto dto) {
        List<Long> successPerformCreditIds = new ArrayList<Long>();
        dto.getCreditIds().forEach(creditId -> {
            creditService.getRepository()
                    .findByIdAndStatus(creditId, CreditStatus.INPROGRESS)
                    .ifPresent(credit -> {
                        CreditTimeline creditTimeline = new CreditTimeline();
                        creditTimeline.setCredit(credit);
                        creditTimeline.setCollector(credit.getCollector());
                        creditTimeline.setNormalStake(Boolean.TRUE);
                        creditTimeline.setAmount(credit.getDailyStake());
                        dailyStakeFactor(credit, creditTimeline);
                        successPerformCreditIds.add(creditId);
                    });
        });
        return successPerformCreditIds;
    }

    // Dans CreditTimelineService.java

    @Transactional
    public List<Long> specialDailyStakeByCollector(SpecialDailyStakeDto dto) {
        List<Long> successPerformCreditIds = new ArrayList<Long>();
        dto.getStakeUnits().forEach(stakeUnit -> {
            creditService.getRepository()
                    .findByIdAndStatus(stakeUnit.getCreditId(), CreditStatus.INPROGRESS)
                    .ifPresent(credit -> {

                        // VÉRIFICATION 1 : Le montant spécial doit être supérieur à la mise normale
                        if (stakeUnit.getAmount() <= credit.getDailyStake()) {
                            throw new CustomValidationException(
                                    "Le montant de la mise spéciale doit être supérieur à la mise journalière !");
                        }

                        // AJOUT DE LA VÉRIFICATION 2 : Le montant ne doit pas dépasser le reste à payer
                        if (stakeUnit.getAmount() > credit.getTotalAmountRemaining()) {
                            throw new CustomValidationException(
                                    "Le montant de la mise spéciale ne peut pas dépasser le montant restant à payer !");
                        }

                        CreditTimeline creditTimeline = new CreditTimeline();
                        creditTimeline.setCredit(credit);
                        creditTimeline.setCollector(credit.getCollector());
                        creditTimeline.setNormalStake(Boolean.FALSE);
                        creditTimeline.setAmount(stakeUnit.getAmount());
                        dailyStakeFactor(credit, creditTimeline);
                        successPerformCreditIds.add(stakeUnit.getCreditId());
                    });
        });
        return successPerformCreditIds;
    }

    public List<CreditTimeline> getAllByCredit(Long creditId) {
        return getRepository().findByCredit_id(creditId);
    }

    public CreditTimelineRepository getRepository() {
        return (CreditTimelineRepository) repository;
    }
}