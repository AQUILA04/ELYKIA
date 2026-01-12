package com.optimize.elykia.core.listener;

import com.optimize.elykia.core.entity.DailyCommercialReport;
import com.optimize.elykia.core.event.*;
import com.optimize.elykia.core.event.CreditCollectionEvent;
import com.optimize.elykia.client.event.*;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.service.DailyOperationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyReportEventListener {

    private final DailyCommercialReportRepository repository;
    private final DailyOperationService dailyOperationService;

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleStockRequestDelivered(StockRequestDeliveredEvent event) {
        log.info("Processing StockRequestDeliveredEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setTotalStockRequestAmount(report.getTotalStockRequestAmount() + event.getAmount());
        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.STOCK_REQUEST,
                event.getAmount(),
                "Stock Request",
                "Sortie de stock");
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleStockReturned(StockReturnedEvent event) {
        log.info("Processing StockReturnedEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setTotalStockRequestAmount(report.getTotalStockRequestAmount() - event.getAmount());
        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.STOCK_RETURN,
                event.getAmount(),
                "Stock Return",
                "Retour de stock");
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleCreditStarted(CreditStartedEvent event) {
        log.info("Processing CreditStartedEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setCreditSalesCount(report.getCreditSalesCount() + 1);
        report.setCreditSalesAmount(report.getCreditSalesAmount() + event.getAmount());
        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.CREDIT_SALES,
                event.getAmount(),
                "Vente Crédit",
                "Nouvelle vente à crédit");
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleClientCreated(ClientCreatedEvent event) {
        log.info("Processing ClientCreatedEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setNewClientsCount(report.getNewClientsCount() + 1);
        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.NEW_CLIENT,
                0.0,
                "Nouveau Client",
                "Nouveau client créé");
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleAccountCreated(AccountCreatedEvent event) {
        log.info("Processing AccountCreatedEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setNewAccountsBalance(report.getNewAccountsBalance() + event.getInitialBalance());

        // Add to total deposit
        report.setTotalAmountToDeposit(report.getTotalAmountToDeposit() + event.getInitialBalance());

        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.NEW_ACCOUNT,
                event.getInitialBalance(),
                "Nouveau Compte",
                "Dépôt initial nouveau compte");
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleCreditCollection(CreditCollectionEvent event) {
        log.info("Processing CreditCollectionEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setCollectionsCount(report.getCollectionsCount() + 1);
        report.setCollectionsAmount(report.getCollectionsAmount() + event.getAmount());

        // Add to total deposit
        report.setTotalAmountToDeposit(report.getTotalAmountToDeposit() + event.getAmount());

        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.CREDIT_COLLECTION,
                event.getAmount(),
                "Recouvrement",
                "Recouvrement crédit");
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("Processing OrderCreatedEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setOrdersCount(report.getOrdersCount() + 1);
        report.setOrdersAmount(report.getOrdersAmount() + event.getAmount());

        // Add to total deposit
        report.setTotalAmountToDeposit(report.getTotalAmountToDeposit() + event.getAmount());

        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.ORDER,
                event.getAmount(),
                "Commande",
                "Nouvelle commande");
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleTontineMemberEnrolled(TontineMemberEnrolledEvent event) {
        log.info("Processing TontineMemberEnrolledEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setTontineMembersCount(report.getTontineMembersCount() + 1);
        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.TONTINE_MEMBER_ENROLLMENT,
                0.0,
                "Nouveau Membre Tontine",
                "Adhésion Tontine");
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleTontineCollection(TontineCollectionEvent event) {
        log.info("Processing TontineCollectionEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setTontineCollectionsCount(report.getTontineCollectionsCount() + 1);
        report.setTontineCollectionsAmount(report.getTontineCollectionsAmount() + event.getAmount());

        // Add to total deposit
        report.setTotalAmountToDeposit(report.getTotalAmountToDeposit() + event.getAmount());

        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.TONTINE_COLLECTION,
                event.getAmount(),
                "Collecte Tontine",
                "Collecte tontine");
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleTontineDelivery(TontineDeliveryEvent event) {
        log.info("Processing TontineDeliveryEvent for collector: {}", event.getCollector());
        DailyCommercialReport report = getOrCreateReport(event.getCollector());
        report.setTontineDeliveriesCount(report.getTontineDeliveriesCount() + 1);
        report.setTontineDeliveriesAmount(report.getTontineDeliveriesAmount() + event.getAmount());
        repository.save(report);

        dailyOperationService.logOperation(
                event.getCollector(),
                com.optimize.elykia.core.enumaration.OperationType.TONTINE_DELIVERY,
                event.getAmount(),
                "Livraison Tontine",
                "Livraison tontine");
    }

    private DailyCommercialReport getOrCreateReport(String commercialUsername) {
        LocalDate today = LocalDate.now();
        return repository.findByDateAndCommercialUsername(today, commercialUsername)
                .orElseGet(() -> {
                    DailyCommercialReport newReport = new DailyCommercialReport();
                    newReport.setDate(today);
                    newReport.setCommercialUsername(commercialUsername);
                    return repository.save(newReport);
                });
    }
}
