package com.optimize.elykia.sale.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.inventory.application.ArticlesService;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.finance.api.CashSalesRegisterPort;
import com.optimize.elykia.sale.api.CreditRecoveryUseCase;
import com.optimize.elykia.sale.api.RecordRecoveryCommand;
import com.optimize.elykia.sale.api.WarehouseCashSalePricingPort;
import com.optimize.elykia.sale.domain.CommercialMonthlyStock;
import com.optimize.elykia.sale.domain.CommercialMonthlyStockCashSalePricing;
import com.optimize.elykia.sale.domain.CommercialMonthlyStockItem;
import com.optimize.elykia.sale.domain.CommercialStockMovementType;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.RecoverySource;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.CreditDto;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import com.optimize.elykia.sale.web.mapper.CreditMapper;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;

/**
 * Service applicatif dédié au cycle de vie des ventes au comptant ({@code CASH}) :
 * création avec réservation magasin, clôture à la livraison, annulation avant livraison et rejet de modification.
 */
@Service
@lombok.extern.slf4j.Slf4j
@Transactional
public class CashSaleService {

    private final CreditRepository creditRepository;
    private final CreditMapper creditMapper;
    private final ClientService clientService;
    private final ArticlesService articlesService;
    private final CreditArticlesService creditArticlesService;
    private final CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    private final CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;
    private final CommercialStockMovementService commercialStockMovementService;
    private final Optional<CommercialMonthlyStockItemSoldValueHistoryService> soldValueHistoryService;
    private final Optional<WarehouseCashSalePricingPort> cashSalePricingService;
    private final Optional<BusinessMetricsPublisher> metricsPublisher;
    private final StockRequestService stockRequestService;
    private final CreditRecoveryUseCase creditRecoveryUseCase;
    private CashSalesRegisterPort cashSalesRegisterPort;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setCashSalesRegisterPort(CashSalesRegisterPort cashSalesRegisterPort) {
        this.cashSalesRegisterPort = cashSalesRegisterPort;
    }

    public CashSaleService(
            CreditRepository creditRepository,
            CreditMapper creditMapper,
            ClientService clientService,
            ArticlesService articlesService,
            CreditArticlesService creditArticlesService,
            CommercialMonthlyStockRepository commercialMonthlyStockRepository,
            CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository,
            CommercialStockMovementService commercialStockMovementService,
            Optional<CommercialMonthlyStockItemSoldValueHistoryService> soldValueHistoryService,
            Optional<WarehouseCashSalePricingPort> cashSalePricingService,
            Optional<BusinessMetricsPublisher> metricsPublisher,
            @Lazy StockRequestService stockRequestService,
            @Lazy CreditRecoveryUseCase creditRecoveryUseCase) {
        this.creditRepository = creditRepository;
        this.creditMapper = creditMapper;
        this.clientService = clientService;
        this.articlesService = articlesService;
        this.creditArticlesService = creditArticlesService;
        this.commercialMonthlyStockRepository = commercialMonthlyStockRepository;
        this.commercialMonthlyStockItemRepository = commercialMonthlyStockItemRepository;
        this.commercialStockMovementService = commercialStockMovementService;
        this.soldValueHistoryService = soldValueHistoryService;
        this.cashSalePricingService = cashSalePricingService;
        this.metricsPublisher = metricsPublisher;
        this.stockRequestService = stockRequestService;
        this.creditRecoveryUseCase = creditRecoveryUseCase;
    }

    public CreditRespDto createCashSale(CreditDto creditDto) {
        Credit credit = creditMapper.toEntity(creditDto);
        Client client = clientService.getById(credit.getClientId());

        attachClient(credit, client);

        if (!StringUtils.hasText(credit.getReference())) {
            String ref = SaleReferenceGenerator.generate(client.getId().toString(), credit.getClientType());
            credit.setReference("CSH-" + ref);
        }

        if (Objects.isNull(credit.getId())) {
            credit.getArticles().forEach(article -> {
                Articles loaded = articlesService.getById(article.getArticlesId());
                article.setArticles(loaded);
                if (cashSalePricingService.isPresent()) {
                    cashSalePricingService.get().quoteWarehouse(
                            loaded,
                            article.getRequestedSalePackMode(),
                            article.getRequestedPackCount(),
                            article.getRequestedUnitsPerPack(),
                            article.getQuantity()).apply(article);
                } else {
                    article.setUnitPrice(CommercialMonthlyStockCashSalePricing.resolveSaleUnitPrice(article));
                }
            });
        }

        credit.initializeAsPendingCashSale(LocalDate.now());

        if (!StringUtils.hasText(credit.getCollector())) {
            throw new CustomValidationException(
                    "Cette vente comptant exige un commercial rattaché au client.");
        }

        credit = creditRepository.save(credit);
        creditRepository.saveAndFlush(credit);

        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        reserveWarehouseForCashSale(credit);
        stockRequestService.createValidatedCashSaleRequest(credit);
        recordInitialRecovery(credit);
        recordCashRegisterReceipt(credit, client);
        return CreditRespDto.fromCredit(credit);
    }

    public CreditRespDto updateCashSale(CreditDto creditDto, Long id) {
        throw new CustomValidationException(
                "Une vente comptant ne peut plus être modifiée. Annulez-la et enregistrez-la de nouveau.");
    }

    public void settleCashSaleOnDelivery(Long creditId) {
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
        if (!credit.awaitingWarehouseDelivery()) {
            throw new CustomValidationException("Cette vente comptant n'est pas en attente de livraison.");
        }
        handleStockCommercialForCashSale(credit);
        credit.settleAfterWarehouseDelivery();
        creditRepository.saveAndFlush(credit);
        metricsPublisher.ifPresent(m -> m.creditSettled(credit.getCollector()));
    }

    public void cancelPendingCashSale(Long creditId) {
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
        if (!credit.isCash() || !credit.awaitingWarehouseDelivery()
                || !CreditStatus.VALIDATED.equals(credit.getStatus())) {
            throw new CustomValidationException("Cette vente comptant ne peut plus être annulée.");
        }
        releaseWarehouseReservation(credit);
        stockRequestService.cancelLinkedCashSaleRequest(credit.getId());
        creditRecoveryUseCase.reverseCollectionsForCancelledCashSale(credit);
        credit.setStatus(CreditStatus.CANCELLED);
        credit.setPendingWarehouseDelivery(false);
        credit.setTotalAmountRemaining(0.0);
        credit.setRemainingDaysCount(0);
        credit.setEffectiveEndDate(null);
        creditRepository.saveAndFlush(credit);
        recordCashRegisterReversal(credit);
    }

    private void recordCashRegisterReceipt(Credit credit, Client client) {
        if (cashSalesRegisterPort == null || credit.getTotalAmount() == null) {
            return;
        }
        try {
            String clientName = client != null ? client.getFullName() : null;
            cashSalesRegisterPort.recordCashSaleReceipt(credit.getId(), credit.getReference(), credit.getTotalAmount(),
                    credit.getClientId(), clientName, credit.getCollector(), null, LocalDate.now());
        } catch (RuntimeException ex) {
            log.warn("Écriture caisse vente comptant en échec pour {} : {}", credit.getReference(), ex.getMessage());
        }
    }

    private void recordCashRegisterReversal(Credit credit) {
        if (cashSalesRegisterPort == null || credit.getTotalAmount() == null) {
            return;
        }
        try {
            String clientName = credit.getClient() != null ? credit.getClient().getFullName() : null;
            cashSalesRegisterPort.recordCashSaleReversal(credit.getId(), credit.getReference(), credit.getTotalAmount(),
                    credit.getClientId(), clientName, credit.getCollector(), null, LocalDate.now());
        } catch (RuntimeException ex) {
            log.warn("Extourne caisse vente comptant en échec pour {} : {}", credit.getReference(), ex.getMessage());
        }
    }

    private void attachClient(Credit credit, Client client) {
        credit.setClient(client);
        if (StringUtils.hasText(client.getAgencyCollector())) {
            credit.setAgencyCommercial(client.getAgencyCollector());
            credit.setCollector(client.getAgencyCollector());
        } else {
            credit.setCollector(client.getCollector());
        }
        credit.setClientType(ClientType.CLIENT);
        credit.setType(OperationType.CASH);
    }

    private void reserveWarehouseForCashSale(Credit credit) {
        if (credit.getArticles() == null) {
            return;
        }
        credit.getArticles().forEach(line -> {
            int quantity = line.getQuantity() == null ? 0 : line.getQuantity();
            articlesService.reserveWarehouseQuantity(line.getArticlesId(), quantity);
        });
    }

    private void releaseWarehouseReservation(Credit credit) {
        if (credit.getArticles() == null) {
            return;
        }
        credit.getArticles().forEach(line -> {
            int quantity = line.getQuantity() == null ? 0 : line.getQuantity();
            articlesService.releaseWarehouseReservation(line.getArticlesId(), quantity);
        });
    }

    private void recordInitialRecovery(Credit credit) {
        RecordRecoveryCommand command = new RecordRecoveryCommand(
                credit.getId(),
                credit.getTotalAmount(),
                null,
                credit.getCommercialUsername(),
                0.0,
                0.0,
                null,
                null,
                null,
                RecoverySource.INITIAL_SALE
        );
        creditRecoveryUseCase.recordInitialSaleRecovery(credit, command);
    }

    private void handleStockCommercialForCashSale(Credit credit) {
        if (!credit.isCash()) {
            return;
        }
        LocalDate now = LocalDate.now();

        String commercialUsername = StringUtils.hasText(credit.getAgencyCommercial())
                ? credit.getAgencyCommercial()
                : credit.getCollector();

        CommercialMonthlyStock monthlyStock = commercialMonthlyStockRepository
                .findByCollectorAndMonthAndYear(commercialUsername, now.getMonthValue(), now.getYear())
                .orElseGet(() -> {
                    CommercialMonthlyStock newStock = new CommercialMonthlyStock();
                    newStock.setCollector(commercialUsername);
                    newStock.setMonth(now.getMonthValue());
                    newStock.setYear(now.getYear());
                    return commercialMonthlyStockRepository.save(newStock);
                });

        credit.getArticles().forEach(creditArticle -> {
            CommercialMonthlyStockItem stockItem = monthlyStock.getItems().stream()
                    .filter(item -> item.getArticle().getId().equals(creditArticle.getArticlesId()))
                    .findFirst()
                    .orElseGet(() -> {
                        CommercialMonthlyStockItem newItem = new CommercialMonthlyStockItem();
                        newItem.setArticle(creditArticle.getArticles());
                        newItem.setMonthlyStock(monthlyStock);
                        monthlyStock.addItem(newItem);
                        return commercialMonthlyStockItemRepository.save(newItem);
                    });

            stockItem.setQuantityTaken(stockItem.getQuantityTaken() + creditArticle.getQuantity());
            stockItem.setQuantitySold(stockItem.getQuantitySold() + creditArticle.getQuantity());

            double saleUnitPrice = CommercialMonthlyStockCashSalePricing.resolveSaleUnitPrice(creditArticle);
            CommercialMonthlyStockCashSalePricing.ensureCreditArticleUnitPrice(creditArticle, saleUnitPrice);
            CommercialMonthlyStockCashSalePricing.initializeStockItemPricingIfAbsent(
                    stockItem, saleUnitPrice, creditArticle.getArticles());

            double currentTotalSold = stockItem.getTotalSoldValue() == null ? 0.0 : stockItem.getTotalSoldValue();
            boolean pricedLine = creditArticle.getSaleLine() != null
                    && creditArticle.getSaleLine().getLineAmount() != null
                    && creditArticle.getSaleLine().getLineAmount() > 0;
            double lineSold = pricedLine
                    ? creditArticle.getSaleLine().getLineAmount()
                    : creditArticle.getQuantity() * saleUnitPrice;
            double lineMargin = pricedLine && creditArticle.getSaleLine().getLineMargin() != null
                    ? creditArticle.getSaleLine().getLineMargin()
                    : creditArticle.getQuantity() * (saleUnitPrice - (stockItem.getWeightedAveragePurchasePrice() == null
                            ? 0.0 : stockItem.getWeightedAveragePurchasePrice()));
            double newTotalSold = CommercialMonthlyStockCashSalePricing.applyExplicitSoldValueAndMargin(
                    stockItem, lineSold, lineMargin);
            stockItem.updateRemaining();

            double stockPmp = stockItem.getWeightedAverageUnitPrice() == null ? 0.0
                    : stockItem.getWeightedAverageUnitPrice();
            soldValueHistoryService.ifPresent(svc -> svc.record(
                    stockItem,
                    credit.getId(),
                    credit.getReference(),
                    CommercialStockMovementType.CASH_SALE,
                    creditArticle.getQuantity(),
                    saleUnitPrice,
                    stockPmp,
                    currentTotalSold,
                    newTotalSold));

            if (commercialStockMovementService != null) {
                commercialStockMovementService.record(
                        stockItem.getId(),
                        credit.getId(),
                        credit.getReference(),
                        CommercialStockMovementType.CASH_SALE,
                        creditArticle.getQuantity(),
                        creditArticle.getQuantity(),
                        0,
                        null,
                        monthlyStock.getCollector(),
                        stockItem.getArticle().getId(),
                        stockItem.getArticle().getCommercialName(),
                        stockItem.getWeightedAveragePurchasePrice(),
                        saleUnitPrice,
                        creditArticle.getSaleLine() != null && creditArticle.getSaleLine().getLineMargin() != null
                                ? creditArticle.getSaleLine().getLineMargin()
                                : (saleUnitPrice - (stockItem.getWeightedAveragePurchasePrice() == null
                                        ? 0.0 : stockItem.getWeightedAveragePurchasePrice()))
                                        * creditArticle.getQuantity(),
                        "CREDIT",
                        credit.getId());
            }

            creditArticle.setStockItemId(stockItem.getId());
            if (creditArticle.getId() != null) {
                creditArticlesService.update(creditArticle);
            }
        });
        commercialMonthlyStockRepository.save(monthlyStock);
    }
}
