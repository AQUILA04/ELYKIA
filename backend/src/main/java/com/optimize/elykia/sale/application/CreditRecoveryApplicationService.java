package com.optimize.elykia.sale.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.finance.application.AccountingDayService;
import com.optimize.elykia.finance.application.DailyAccountancyService;
import com.optimize.elykia.finance.domain.DailyAccountancy;
import com.optimize.elykia.sale.api.BatchRecoveryResult;
import com.optimize.elykia.sale.api.CreditRecoveryUseCase;
import com.optimize.elykia.sale.api.FieldControlCreditPosting;
import com.optimize.elykia.sale.api.FieldControlRecoveryCommand;
import com.optimize.elykia.sale.api.RecordRecoveryBatchCommand;
import com.optimize.elykia.sale.api.RecordRecoveryCommand;
import com.optimize.elykia.sale.api.SaleBiAggregationPort;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditPurpose;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.CreditTimeline;
import com.optimize.elykia.sale.domain.RecoveryPayment;
import com.optimize.elykia.sale.domain.RecoverySource;
import com.optimize.elykia.sale.event.CreditCollectionCancelledEvent;
import com.optimize.elykia.sale.event.CreditCollectionEvent;
import com.optimize.elykia.sale.infrastructure.persistence.CreditTimelineRepository;
import com.optimize.elykia.sale.web.dto.CreditTimelineRespDto;
import com.optimize.elykia.shared.carnet.CarnetEcartRules;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import com.optimize.elykia.shared.security.CollectorAudienceSecurity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Moteur applicatif hexagonal unifié pour tous les flux de recouvrement des crédits.
 * Implémente le Driving Port {@link CreditRecoveryUseCase}.
 */
@Service
@Transactional
@Slf4j
public class CreditRecoveryApplicationService implements CreditRecoveryUseCase {

    private final CreditTimelineRepository timelineRepository;
    private final CreditService creditService;
    private final ClientService clientService;
    private final DailyAccountancyService dailyAccountancyService;
    private final AccountingDayService accountingDayService;
    private final ApplicationEventPublisher eventPublisher;
    private final ClientReliquatService clientReliquatService;
    private final UserService userService;
    private final TransactionTemplate requiresNewTransactionTemplate;

    private CreditPaymentEventService creditPaymentEventService;
    private CreditEnrichmentService creditEnrichmentService;
    private SaleBiAggregationPort biAggregationService;
    private BusinessMetricsPublisher metricsPublisher;

    public CreditRecoveryApplicationService(
            CreditTimelineRepository timelineRepository,
            CreditService creditService,
            ClientService clientService,
            DailyAccountancyService dailyAccountancyService,
            AccountingDayService accountingDayService,
            ApplicationEventPublisher eventPublisher,
            ClientReliquatService clientReliquatService,
            UserService userService,
            PlatformTransactionManager transactionManager) {
        this.timelineRepository = timelineRepository;
        this.creditService = creditService;
        this.clientService = clientService;
        this.dailyAccountancyService = dailyAccountancyService;
        this.accountingDayService = accountingDayService;
        this.eventPublisher = eventPublisher;
        this.clientReliquatService = clientReliquatService;
        this.userService = userService;
        this.requiresNewTransactionTemplate = new TransactionTemplate(transactionManager);
        this.requiresNewTransactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
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
     * Enregistrement d'un recouvrement unitaire (Web, RecoveryManager, Mobile Money).
     * Prépare la journée comptable HORS transaction JPA, puis exécute le recouvrement en {@code REQUIRES_NEW}.
     */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CreditTimeline recordRecovery(RecordRecoveryCommand command) {
        try {
            if (StringUtils.hasText(command.reference()) && timelineRepository.existsByReference(command.reference())) {
                return timelineRepository.findByReference(command.reference()).orElseThrow();
            }
            ensureAccountingReadyOrFail("recordRecovery");
            return requiresNewTransactionTemplate.execute(status -> doRecordRecovery(command));
        } catch (RuntimeException e) {
            log.error("Échec recouvrement creditId={} reference={} source={}: {}",
                    command.creditId(), command.reference(), command.source(), e.getMessage(), e);
            throw e;
        }
    }

    private CreditTimeline doRecordRecovery(RecordRecoveryCommand command) {
        Credit credit = creditService.getById(command.creditId());
        RecoverySource source = command.source() != null ? command.source() : RecoverySource.WEB_SINGLE;

        if (source.requiresCollectorOwnershipCheck()) {
            CollectorAudienceSecurity.assertPromoterOwnsCreditCollector(
                    userService.getCurrentUser(), credit.getCommercialUsername());
        }

        double reliquatGenerated = command.reliquatGeneratedAmount() != null ? command.reliquatGeneratedAmount() : 0.0;
        double reliquatUsed = command.reliquatUsedAmount() != null ? command.reliquatUsedAmount() : 0.0;
        double resolvedAmount = command.amount() != null
                ? command.amount()
                : resolveFallbackDefaultAmount(credit);

        if (source.supportsAutoReliquatClosure()) {
            AutoReliquatResolution resolution = resolveAutoReliquatForClosure(
                    credit, resolvedAmount, reliquatGenerated, reliquatUsed);
            resolvedAmount = resolution.amount();
            reliquatGenerated = resolution.reliquatGenerated();
            reliquatUsed = resolution.reliquatUsed();
        }

        RecoveryPayment payment = new RecoveryPayment(
                resolvedAmount,
                reliquatGenerated,
                reliquatUsed,
                command.reference(),
                command.collector(),
                command.operationConsentCode(),
                command.confirmedAmount(),
                command.syncConsentCode(),
                source
        );

        CreditTimeline timeline = executeDomainRecovery(credit, payment);
        applyClientReliquatMovements(credit, reliquatGenerated, reliquatUsed, timeline.getReference());
        return timeline;
    }

    /**
     * Enregistrement d'un lot de recouvrements avec isolation transactionnelle {@code REQUIRES_NEW} par unité.
     */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public BatchRecoveryResult recordRecoveryBatch(RecordRecoveryBatchCommand command) {
        ensureAccountingReadyOrFail("recordRecoveryBatch");
        List<String> successRecoveryIds = new ArrayList<>();
        List<BatchRecoveryResult.FailedRecoveryItem> failedRecoveries = new ArrayList<>();

        for (RecordRecoveryCommand item : command.items()) {
            String recoveryId = item.reference();
            try {
                requiresNewTransactionTemplate.executeWithoutResult(status ->
                        processBatchItem(item, command, successRecoveryIds));
            } catch (Exception e) {
                log.error("Échec recouvrement lot recoveryId={} creditId={} amount={}: {}",
                        recoveryId, item.creditId(), item.amount(), e.getMessage(), e);
                failedRecoveries.add(new BatchRecoveryResult.FailedRecoveryItem(recoveryId, rootMessage(e)));
            }
        }
        return new BatchRecoveryResult(successRecoveryIds, failedRecoveries);
    }

    private void processBatchItem(
            RecordRecoveryCommand item,
            RecordRecoveryBatchCommand batchCommand,
            List<String> successRecoveryIds) {
        String recoveryId = item.reference();
        if (StringUtils.hasText(recoveryId) && timelineRepository.existsByReference(recoveryId)) {
            successRecoveryIds.add(recoveryId);
            return;
        }

        Optional<Credit> creditOptional = creditService.getRepository()
                .findByIdAndStatus(item.creditId(), CreditStatus.INPROGRESS);

        if (creditOptional.isEmpty()) {
            if (metricsPublisher != null) {
                metricsPublisher.collectionFailed("unknown", "CREDIT_NOT_FOUND");
            }
            if (!batchCommand.ignoreMissingOrClosedCredit()) {
                throw new CustomValidationException(
                        "Crédit introuvable ou statut incorrect pour l'ID: " + item.creditId());
            }
            log.warn("Mise ignorée : crédit introuvable ou non INPROGRESS id={} recoveryId={}",
                    item.creditId(), recoveryId);
            return;
        }

        Credit credit = creditOptional.get();
        RecoverySource source = item.source() != null ? item.source() : RecoverySource.MOBILE_SYNC;

        if (source.requiresCollectorOwnershipCheck()) {
            CollectorAudienceSecurity.assertPromoterOwnsCreditCollector(
                    userService.getCurrentUser(), credit.getCommercialUsername());
        }

        double resolvedAmount = item.amount() != null
                ? item.amount()
                : resolveFallbackDefaultAmount(credit);
        double reliquatGenerated = item.reliquatGeneratedAmount() != null ? item.reliquatGeneratedAmount() : 0.0;
        double reliquatUsed = item.reliquatUsedAmount() != null ? item.reliquatUsedAmount() : 0.0;
        String syncConsentCode = StringUtils.hasText(item.syncConsentCode())
                ? item.syncConsentCode()
                : batchCommand.syncConsentCode();
        String commercialUsername = StringUtils.hasText(credit.getCommercialUsername())
                ? credit.getCommercialUsername()
                : (StringUtils.hasText(item.collector()) ? item.collector() : batchCommand.collector());

        RecoveryPayment payment = new RecoveryPayment(
                resolvedAmount,
                reliquatGenerated,
                reliquatUsed,
                recoveryId,
                commercialUsername,
                item.operationConsentCode(),
                item.confirmedAmount(),
                syncConsentCode,
                source
        );

        CreditTimeline timeline = executeDomainRecovery(credit, payment);
        applyClientReliquatMovements(credit, reliquatGenerated, reliquatUsed, timeline.getReference());
        successRecoveryIds.add(StringUtils.hasText(recoveryId) ? recoveryId : timeline.getReference());
    }

    /**
     * Imputation interne d'un écart de carnet crédit accepté.
     * L'événement de caisse n'est pas publié immédiatement : l'appelant le publie après création du manquant.
     */
    @Override
    public FieldControlCreditPosting recordFieldControlRecovery(FieldControlRecoveryCommand command) {
        ensureAccountingReadyOrFail("fieldControlRecovery");
        String reference = command.reference();
        if (StringUtils.hasText(reference) && timelineRepository.existsByReference(reference)) {
            CreditTimeline existing = timelineRepository.findByReference(reference).orElseThrow();
            double imputed = existing.getAmount() != null ? existing.getAmount() : 0d;
            double reliquat = existing.getReliquatGeneratedAmount() != null ? existing.getReliquatGeneratedAmount() : 0d;
            return new FieldControlCreditPosting(
                    imputed,
                    reliquat,
                    imputed + reliquat,
                    reference,
                    existing.getCommercialUsername(),
                    existing.getCredit() != null ? existing.getCredit().getReference() : null,
                    true);
        }

        Credit credit = creditService.getById(command.creditId());
        double remaining = credit.getTotalAmountRemaining() != null ? credit.getTotalAmountRemaining() : 0d;
        CarnetEcartRules.CreditSplit split = CarnetEcartRules.creditSplit(command.cashAmount(), remaining);

        if (split.imputedOnCredit() > CarnetEcartRules.MONEY_EPSILON) {
            RecoveryPayment payment = new RecoveryPayment(
                    split.imputedOnCredit(),
                    split.reliquat(),
                    0.0,
                    reference,
                    credit.getCommercialUsername(),
                    null,
                    null,
                    null,
                    RecoverySource.FIELD_CONTROL_ECART
            );
            executeDomainRecovery(credit, payment);
        }
        if (split.reliquat() > CarnetEcartRules.MONEY_EPSILON && credit.getClientId() != null) {
            clientReliquatService.addReliquat(credit.getClientId(), split.reliquat(), reference, null);
        }
        return new FieldControlCreditPosting(
                split.imputedOnCredit(),
                split.reliquat(),
                split.cash(),
                reference,
                credit.getCommercialUsername(),
                credit.getReference(),
                false);
    }

    @Override
    public void publishFieldControlCash(FieldControlCreditPosting posting) {
        if (posting == null || posting.alreadyExisted() || eventPublisher == null) {
            return;
        }
        if (posting.cash() <= CarnetEcartRules.MONEY_EPSILON) {
            return;
        }
        eventPublisher.publishEvent(new CreditCollectionEvent(
                this,
                posting.imputedOnCredit(),
                posting.collector(),
                posting.creditReference(),
                posting.reference(),
                posting.reliquat(),
                0d));
    }

    /**
     * Recouvrement initial (vente comptant / livraison tontine) dans la transaction appelante.
     * Utilise le {@link Credit} déjà géré sans ouvrir de nouvelle transaction.
     */
    @Override
    public CreditTimeline recordInitialSaleRecovery(Credit managedCredit, RecordRecoveryCommand command) {
        double amount = command.amount() != null ? command.amount() : managedCredit.getTotalAmount();
        double reliquatGenerated = command.reliquatGeneratedAmount() != null ? command.reliquatGeneratedAmount() : 0.0;
        double reliquatUsed = command.reliquatUsedAmount() != null ? command.reliquatUsedAmount() : 0.0;
        RecoveryPayment payment = new RecoveryPayment(
                amount,
                reliquatGenerated,
                reliquatUsed,
                command.reference(),
                StringUtils.hasText(command.collector()) ? command.collector() : managedCredit.getCommercialUsername(),
                command.operationConsentCode(),
                command.confirmedAmount(),
                command.syncConsentCode(),
                RecoverySource.INITIAL_SALE
        );
        return executeDomainRecovery(managedCredit, payment);
    }

    /**
     * Annule un recouvrement : soft-delete du timeline, reverse des montants sur l'agrégat crédit,
     * reverse des reliquats et publication de {@link CreditCollectionCancelledEvent}.
     */
    @Override
    public CreditTimelineRespDto cancelRecovery(Long timelineId) {
        CreditTimeline timeline = timelineRepository.findByIdWithCreditAndClient(timelineId)
                .orElseThrow(() -> new ResourceNotFoundException("Recouvrement introuvable."));

        if (State.DELETED.equals(timeline.getState())) {
            throw new CustomValidationException("Ce recouvrement est déjà annulé.");
        }

        Credit credit = timeline.getCredit();
        if (credit == null) {
            throw new CustomValidationException("Crédit associé au recouvrement introuvable.");
        }
        if (credit.awaitingWarehouseDelivery()) {
            throw new CustomValidationException(
                    "Annulez la vente comptant : l'encaissement est extourné avec la demande de sortie.");
        }

        double amount = timeline.getAmount() != null ? timeline.getAmount() : 0.0;
        double generated = timeline.getReliquatGeneratedAmount() != null ? timeline.getReliquatGeneratedAmount() : 0.0;
        double used = timeline.getReliquatUsedAmount() != null ? timeline.getReliquatUsedAmount() : 0.0;

        timeline.markDeleted();
        timelineRepository.save(timeline);

        boolean reopened = credit.reverseRecovery(amount);
        creditService.update(credit);

        if (reopened && credit.getClientId() != null && ClientType.CLIENT.equals(credit.getClientType())) {
            CreditPurpose purpose = credit.getCreditPurpose() != null
                    ? credit.getCreditPurpose()
                    : CreditPurpose.PERSONAL;
            if (CreditPurpose.BUSINESS.equals(purpose)) {
                clientService.updateBusinessCreditInProgress(credit.getClientId(), Boolean.TRUE);
            } else {
                clientService.updateCreditStatus(credit.getClientId(), Boolean.TRUE);
            }
        }

        reverseClientReliquatMovements(credit, generated, used, timeline.getReference());
        publishCancelledEvent(credit, timeline, amount, generated, used);

        log.info("Recouvrement annulé timelineId={} reference={} creditId={} amount={}",
                timelineId, timeline.getReference(), credit.getId(), amount);
        return CreditTimelineRespDto.fromEntity(timeline);
    }

    /**
     * Extourne les encaissements d'une vente comptant annulée avant la remise,
     * sans rouvrir la vente comme un crédit en cours.
     */
    @Override
    public void reverseCollectionsForCancelledCashSale(Credit credit) {
        List<CreditTimeline> timelines = timelineRepository.findByCreditIdAndState(credit.getId(), State.ENABLED);
        for (CreditTimeline timeline : timelines) {
            double amount = timeline.getAmount() != null ? timeline.getAmount() : 0.0;
            double generated = timeline.getReliquatGeneratedAmount() != null ? timeline.getReliquatGeneratedAmount() : 0.0;
            double used = timeline.getReliquatUsedAmount() != null ? timeline.getReliquatUsedAmount() : 0.0;

            timeline.markDeleted();
            timelineRepository.save(timeline);
            credit.reverseRecovery(amount);
            if (CreditStatus.INPROGRESS.equals(credit.getStatus())) {
                credit.setStatus(CreditStatus.VALIDATED);
                credit.setEffectiveEndDate(null);
            }

            reverseClientReliquatMovements(credit, generated, used, timeline.getReference());
            publishCancelledEvent(credit, timeline, amount, generated, used);
        }
        credit.setTotalAmountRemaining(0.0);
        credit.setRemainingDaysCount(0);
    }

    private CreditTimeline executeDomainRecovery(Credit credit, RecoveryPayment payment) {
        try {
            String commercial = credit.getCommercialUsername();
            DailyAccountancy dailyAccountancy = dailyAccountancyService.getByCollectorOrCreateNew(commercial);
            CreditTimeline timeline = credit.applyRecovery(payment, dailyAccountancy);

            creditService.update(credit);
            timeline = timelineRepository.save(timeline);

            if (CreditStatus.SETTLED.equals(credit.getStatus()) || credit.getTotalAmountRemaining() == 0.0) {
                creditService.syncClientCreditFlagsAfterClose(credit);
            }

            if (creditPaymentEventService != null) {
                creditPaymentEventService.recordPayment(credit, timeline.getAmount(), "CASH");
            }

            if (creditEnrichmentService != null) {
                creditEnrichmentService.enrichCredit(credit);
                creditService.update(credit);
            }

            if (metricsPublisher != null) {
                metricsPublisher.collectionRecorded(commercial, timeline.getAmount());
                if (CreditStatus.SETTLED.equals(credit.getStatus())) {
                    metricsPublisher.creditSettled(commercial);
                }
            }

            if (payment.source().publishesCollectionEventImmediately() && eventPublisher != null) {
                String clientName = credit.getClient() != null ? credit.getClient().getFullName() : "N/A";
                String ref = credit.getReference() + " | Client : " + clientName;
                eventPublisher.publishEvent(new CreditCollectionEvent(
                        this,
                        timeline.getAmount(),
                        timeline.getCommercialUsername(),
                        ref,
                        timeline.getReference(),
                        timeline.getReliquatGeneratedAmount(),
                        timeline.getReliquatUsedAmount()
                ));
            }

            if (biAggregationService != null) {
                try {
                    biAggregationService.updateCollectionAggregation(timeline);
                } catch (Exception e) {
                    log.error("Échec agrégation BI pour recoveryRef={} creditId={}: {}",
                            timeline.getReference(), credit.getId(), e.getMessage(), e);
                }
            }

            return timeline;
        } catch (RuntimeException e) {
            log.error("Échec exécution domaine recouvrement creditId={} commercial={} reference={}: {}",
                    credit.getId(), credit.getCommercialUsername(), payment.reference(), e.getMessage(), e);
            throw e;
        }
    }

    private double resolveFallbackDefaultAmount(Credit credit) {
        double remaining = credit.getTotalAmountRemaining() != null ? credit.getTotalAmountRemaining() : 0.0;
        double dailyStake = credit.getDailyStake() != null ? credit.getDailyStake() : 0.0;
        if (dailyStake > 0.0 && remaining > 0.0) {
            return Math.min(dailyStake, remaining);
        }
        return dailyStake;
    }

    record AutoReliquatResolution(double amount, double reliquatGenerated, double reliquatUsed) {
    }

    AutoReliquatResolution resolveAutoReliquatForClosure(
            Credit credit,
            double requestedAmount,
            double reliquatGenerated,
            double reliquatUsed) {
        if (credit == null || credit.getClientId() == null) {
            return new AutoReliquatResolution(requestedAmount, reliquatGenerated, reliquatUsed);
        }
        double remaining = credit.getTotalAmountRemaining() != null ? credit.getTotalAmountRemaining() : 0.0;
        if (remaining <= 0.0 || reliquatUsed > 0.0) {
            return new AutoReliquatResolution(requestedAmount, reliquatGenerated, reliquatUsed);
        }

        Double availableObj = clientReliquatService.getReliquatForClient(credit.getClientId());
        double available = availableObj != null ? Math.max(0.0, availableObj) : 0.0;
        if (available <= 0.0) {
            return new AutoReliquatResolution(requestedAmount, reliquatGenerated, reliquatUsed);
        }

        double cashOrAmount = Math.max(0.0, requestedAmount);
        if (cashOrAmount < remaining && cashOrAmount + available >= remaining) {
            double computedReliquatUsed = remaining - cashOrAmount;
            log.info("Auto-reliquat clôture creditId={} remaining={} cash={} reliquatUsed={}",
                    credit.getId(), remaining, cashOrAmount, computedReliquatUsed);
            return new AutoReliquatResolution(remaining, reliquatGenerated, computedReliquatUsed);
        }

        return new AutoReliquatResolution(requestedAmount, reliquatGenerated, reliquatUsed);
    }

    private void applyClientReliquatMovements(
            Credit credit,
            double reliquatGenerated,
            double reliquatUsed,
            String reference) {
        if (credit.getClientId() == null) {
            return;
        }
        if (reliquatGenerated > 0.0) {
            clientReliquatService.addReliquat(credit.getClientId(), reliquatGenerated, reference, null);
        }
        if (reliquatUsed > 0.0) {
            clientReliquatService.consumeReliquat(credit.getClientId(), reliquatUsed, reference, null);
        }
    }

    private void reverseClientReliquatMovements(
            Credit credit,
            double generated,
            double used,
            String reference) {
        if (credit.getClientId() == null) {
            return;
        }
        if (generated > 0.0) {
            clientReliquatService.consumeReliquat(credit.getClientId(), generated, reference, null);
        }
        if (used > 0.0) {
            clientReliquatService.addReliquat(credit.getClientId(), used, reference, null);
        }
    }

    private void publishCancelledEvent(
            Credit credit,
            CreditTimeline timeline,
            double amount,
            double generated,
            double used) {
        if (eventPublisher == null) {
            return;
        }
        String ref = credit.getReference() + " | Client : "
                + (credit.getClient() != null ? credit.getClient().getFullName() : "N/A");
        LocalDate operationDate = timeline.getCreatedDate() != null
                ? timeline.getCreatedDate().toLocalDate()
                : LocalDate.now();
        eventPublisher.publishEvent(new CreditCollectionCancelledEvent(
                this,
                amount,
                timeline.getCommercialUsername(),
                ref,
                timeline.getReference(),
                generated,
                used,
                operationDate));
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
}
