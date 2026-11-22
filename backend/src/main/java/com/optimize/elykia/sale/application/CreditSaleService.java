package com.optimize.elykia.sale.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.inventory.application.ArticlesService;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.sale.api.AdhesionCreditPort;
import com.optimize.elykia.sale.domain.CommercialMonthlyStock;
import com.optimize.elykia.sale.domain.CommercialMonthlyStockCashSalePricing;
import com.optimize.elykia.sale.domain.CommercialMonthlyStockItem;
import com.optimize.elykia.sale.domain.CommercialStockMovementType;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticleUnitPricePolicy;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditDailyStakeHistory;
import com.optimize.elykia.sale.domain.CreditPurpose;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.Order;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditDailyStakeHistoryRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.ChangeDailyStakeDto;
import com.optimize.elykia.sale.web.dto.CreditDailyStakeHistoryDto;
import com.optimize.elykia.sale.web.dto.CreditDto;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import com.optimize.elykia.sale.web.dto.DistributeArticleDto;
import com.optimize.elykia.sale.web.mapper.CreditMapper;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Service applicatif dédié au cycle de vie des ventes à crédit ({@code CREDIT}) :
 * création, mise à jour, distribution mobile/terrain, validation, démarrage, modification de mise,
 * unicité par objet, synchronisation des indicateurs client et suppression douce.
 */
@Service
@Transactional
public class CreditSaleService {

    private final CreditRepository creditRepository;
    private final CreditMapper creditMapper;
    private final ClientService clientService;
    private final ArticlesService articlesService;
    private final CreditArticlesService creditArticlesService;
    private final CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    private final CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;
    private final CreditDailyStakeHistoryRepository creditDailyStakeHistoryRepository;
    private final CreditEnrichmentService creditEnrichmentService;
    private final CommercialStockMovementService commercialStockMovementService;
    private final SalePostStartPublisher postStartPublisher;
    private final Optional<CommercialMonthlyStockItemSoldValueHistoryService> soldValueHistoryService;
    private final Optional<AdhesionCreditPort> adhesionService;
    private final Optional<BusinessMetricsPublisher> metricsPublisher;

    public CreditSaleService(
            CreditRepository creditRepository,
            CreditMapper creditMapper,
            ClientService clientService,
            ArticlesService articlesService,
            CreditArticlesService creditArticlesService,
            CommercialMonthlyStockRepository commercialMonthlyStockRepository,
            CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository,
            CreditDailyStakeHistoryRepository creditDailyStakeHistoryRepository,
            CreditEnrichmentService creditEnrichmentService,
            CommercialStockMovementService commercialStockMovementService,
            SalePostStartPublisher postStartPublisher,
            Optional<CommercialMonthlyStockItemSoldValueHistoryService> soldValueHistoryService,
            Optional<AdhesionCreditPort> adhesionService,
            Optional<BusinessMetricsPublisher> metricsPublisher) {
        this.creditRepository = creditRepository;
        this.creditMapper = creditMapper;
        this.clientService = clientService;
        this.articlesService = articlesService;
        this.creditArticlesService = creditArticlesService;
        this.commercialMonthlyStockRepository = commercialMonthlyStockRepository;
        this.commercialMonthlyStockItemRepository = commercialMonthlyStockItemRepository;
        this.creditDailyStakeHistoryRepository = creditDailyStakeHistoryRepository;
        this.creditEnrichmentService = creditEnrichmentService;
        this.commercialStockMovementService = commercialStockMovementService;
        this.postStartPublisher = postStartPublisher;
        this.soldValueHistoryService = soldValueHistoryService;
        this.adhesionService = adhesionService;
        this.metricsPublisher = metricsPublisher;
    }

    public CreditRespDto createCredit(CreditDto creditDto) {
        CreditPurpose explicitPurpose = creditDto.getCreditPurpose() != null
                ? creditDto.getCreditPurpose() : CreditPurpose.PERSONAL;
        Credit credit = creditMapper.toEntity(creditDto);
        credit.setCreditPurpose(explicitPurpose);
        creditControlProcess(credit);
        creditUnicity(credit, dualCreditAuthorizationEnabled() ? explicitPurpose : null);

        CreditRespDto result = createAndProcessCredit(credit, creditDto.getClientId(),
                dualCreditAuthorizationEnabled() ? explicitPurpose : CreditPurpose.PERSONAL);
        metricsPublisher.ifPresent(m -> m.creditCreated(
                credit.getCollector(),
                credit.getType() != null ? credit.getType().name() : "CREDIT"));
        return result;
    }

    public Long transformOrderToCredit(Order order) {
        DistributeArticleDto distributeArticleDto = DistributeArticleDto.fromOrder(order);
        CreditRespDto credit = distributeArticlesV2(distributeArticleDto);
        return credit.id();
    }

    public void creditUnicity(Credit credit) {
        creditUnicity(credit, null);
    }

    public void creditUnicity(Credit credit, CreditPurpose explicitPurpose) {
        if (!ClientType.CLIENT.equals(credit.getClientType())) {
            return;
        }
        Long clientId = credit.getClientId();
        if (explicitPurpose == null) {
            if (creditRepository.hasCreditInProgress(clientId)) {
                metricsPublisher.ifPresent(m -> m.creditCreationFailed("DUPLICATE_IN_PROGRESS"));
                throw new CustomValidationException("Le client " + credit.getClient().getFullName()
                        + " possède déjà une vente en cours et ne peut donc pas bénéficier d'une autre vente !");
            }
            return;
        }
        if (creditRepository.hasCreditInProgressForPurpose(clientId, explicitPurpose)) {
            metricsPublisher.ifPresent(m -> m.creditCreationFailed("DUPLICATE_IN_PROGRESS"));
            throw new CustomValidationException("Le client " + credit.getClient().getFullName()
                    + " possède déjà une vente " + explicitPurpose + " en cours !");
        }
    }

    public void syncClientCreditFlagsAfterClose(Credit credit) {
        if (credit.getClientId() == null || !ClientType.CLIENT.equals(credit.getClientType())) {
            return;
        }
        Long clientId = credit.getClientId();
        CreditPurpose purpose = credit.getCreditPurpose() != null
                ? credit.getCreditPurpose() : CreditPurpose.PERSONAL;
        if (CreditPurpose.BUSINESS.equals(purpose)) {
            if (!creditRepository.hasCreditInProgressForPurpose(clientId, CreditPurpose.BUSINESS)) {
                clientService.updateBusinessCreditInProgress(clientId, Boolean.FALSE);
            }
        } else if (CreditPurpose.EVENT.equals(purpose)) {
            if (!creditRepository.hasCreditInProgressForPurpose(clientId, CreditPurpose.EVENT)) {
                clientService.updateEventCreditInProgress(clientId, Boolean.FALSE);
            }
        } else if (!creditRepository.hasCreditInProgressForPurpose(clientId, CreditPurpose.PERSONAL)) {
            clientService.updateCreditStatus(clientId, Boolean.FALSE);
        }
    }

    public Credit creditEnrichment(Credit credit) {
        if (creditEnrichmentService != null) {
            creditEnrichmentService.enrichCredit(credit);
            return creditRepository.saveAndFlush(credit);
        }
        return credit;
    }

    public CreditRespDto updateCredit(CreditDto creditDto, Long id) {
        creditDto.setId(id);
        Credit oldOne = getById(id);

        Credit credit = creditMapper.toEntity(creditDto);
        if (!List.of(CreditStatus.CREATED, CreditStatus.VALIDATED).contains(oldOne.getStatus())) {
            throw new CustomValidationException("Cette vente ne peut plus être modifier à ce stade !");
        }
        creditControlProcess(credit);
        oldOne.getArticles().forEach(creditArticlesService::delete);
        credit.setStatus(CreditStatus.CREATED);
        credit.setTotalAmountPaid(oldOne.getTotalAmountPaid());
        credit.setAdvance(oldOne.getAdvance());
        credit.setBeginDate(oldOne.getBeginDate());
        credit.checkAdvance();
        credit.setAccountingDate(oldOne.getAccountingDate());
        credit.setReleaseDate(oldOne.getReleaseDate());
        credit.setDailyPaid(oldOne.getDailyPaid());
        credit.setClientType(oldOne.getClientType());
        credit = creditRepository.saveAndFlush(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        return CreditRespDto.fromCredit(credit);
    }

    public void creditControlProcess(Credit credit) {
        Client client = clientService.getById(credit.getClientId());
        credit.setCollector(client.getCollector());
        credit.setClient(client);
        if (credit.getType() == null) {
            credit.setType(OperationType.CREDIT);
        }
        credit.setClientType(Objects.nonNull(client.getClientType()) ? client.getClientType() : ClientType.CLIENT);

        LocalDate now = LocalDate.now();
        if (Objects.isNull(credit.getId())) {
            processNewCredit(credit, now);
        } else {
            processExistingCredit(credit, now);
        }

        setupCredit(credit, client);
    }

    public boolean changeDailyStake(ChangeDailyStakeDto dto) {
        Credit credit = getById(dto.creditId());
        credit.lifecyclePolicy().assertDailyStakeChangeAllowed(credit);

        CreditDailyStakeHistory history = new CreditDailyStakeHistory();
        history.setCredit(credit);
        history.setOldDailyStake(credit.getDailyStake());
        history.setNewDailyStake(dto.dailyStake());
        history.setChangeDate(LocalDateTime.now());
        history.setAmountRemaining(credit.getTotalAmountRemaining());
        creditDailyStakeHistoryRepository.save(history);

        credit.changeDailyStake(dto.dailyStake());
        creditRepository.saveAndFlush(credit);
        metricsPublisher.ifPresent(m -> m.creditDailyStakeChanged(credit.getId()));
        return Boolean.TRUE;
    }

    @Transactional(readOnly = true)
    public List<CreditDailyStakeHistoryDto> getDailyStakeHistory(Long creditId) {
        return creditDailyStakeHistoryRepository.findByCreditIdOrderByChangeDateDesc(creditId)
                .stream()
                .map(CreditDailyStakeHistoryDto::fromEntity)
                .toList();
    }

    public CreditRespDto distributeArticlesV2(DistributeArticleDto dto) {
        dto.validateEntryArticles();

        Client client = clientService.getById(dto.getClientId());
        client.validateClientOperation();
        CommercialMonthlyStock monthlyStock = commercialMonthlyStockRepository
                .getCommercialMonthStock(client.getCollector());

        Credit clientCredit = Credit.buildDistribution(client, dto);
        creditControlProcess(clientCredit);
        applyDistributionPricingFromStock(clientCredit, monthlyStock);
        if (!clientCredit.isMobileFinancialTermsLocked()) {
            clientCredit.setTotalAmount(clientCredit.getTotalAmountByCalcul());
        }
        CreditPurpose requested = dto.getCreditPurpose() != null
                ? dto.getCreditPurpose() : CreditPurpose.PERSONAL;
        adhesionService.ifPresent(port -> port.assertCreditAllowed(client, requested, clientCredit.getTotalAmount()));
        boolean dualCredit = dualCreditAuthorizationEnabled();
        CreditPurpose explicitPurpose = dualCredit ? requested : CreditPurpose.PERSONAL;
        clientCredit.setCreditPurpose(explicitPurpose);
        creditUnicity(clientCredit, dualCredit ? explicitPurpose : null);

        if (StringUtils.hasText(dto.getReference())) {
            if (creditRepository.existsByReference(dto.getReference())) {
                return CreditRespDto.fromCredit(creditRepository.findByReference(dto.getReference()).orElseThrow());
            }
            clientCredit.setReference(dto.getReference());
        }

        clientCredit.validate();
        clientCredit.start();
        creditRepository.saveAndFlush(clientCredit);

        checkAndUpdateStockCommercial(clientCredit, monthlyStock);
        creditRepository.saveAndFlush(clientCredit);
        postStartPublisher.publishAfterStart(clientCredit);

        markPurposeInProgress(client.getId(), explicitPurpose);
        return CreditRespDto.fromCredit(clientCredit);
    }

    public Boolean validateCredit(Long creditId) {
        Credit credit = getById(creditId);
        credit.validate();
        creditRepository.saveAndFlush(credit);
        return Boolean.TRUE;
    }

    public Boolean startCredit(Long creditId, Boolean distribution) {
        Credit credit = getById(creditId);
        credit.lifecyclePolicy().validateBeforeStart(credit);
        if (Boolean.FALSE.equals(distribution) && !credit.isTontine()) {
            releaseWarehouseStockForCreditStart(credit);
        }

        credit.start();
        creditRepository.saveAndFlush(credit);

        postStartPublisher.publishAfterStart(credit);
        return Boolean.TRUE;
    }

    public boolean deleteSoft(Long id) throws ApplicationException {
        Credit credit = getById(id);
        credit.lifecyclePolicy().assertSoftDeleteAllowed(credit);
        credit.setState(State.DELETED);
        creditRepository.saveAndFlush(credit);
        syncClientCreditFlagsAfterClose(credit);
        return true;
    }

    public void updateReleasePrinted(LocalDate releaseDate) {
        creditRepository.updateReleasePrinted(releaseDate);
    }

    private Credit getById(Long id) {
        return creditRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }

    private CreditRespDto createAndProcessCredit(Credit credit, Long clientId, CreditPurpose explicitPurpose) {
        credit = creditRepository.save(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        markPurposeInProgress(clientId, explicitPurpose);

        if (creditEnrichmentService != null) {
            creditEnrichmentService.enrichCredit(credit);
            credit = creditRepository.saveAndFlush(credit);
        }

        return CreditRespDto.fromCredit(creditEnrichment(credit));
    }

    private void processNewCredit(Credit credit, LocalDate now) {
        credit.getArticles().forEach(article -> {
            Articles oneArticle = articlesService.getById(article.getArticlesId());
            article.setArticles(oneArticle);

            if (credit.isClientCredit()) {
                setCommercialPricing(article, oneArticle, now, credit.getCollector());
            } else {
                article.setUnitPrice(oneArticle.getCreditSalePrice());
            }
        });
    }

    private void processExistingCredit(Credit credit, LocalDate now) {
        Credit oldOne = getById(credit.getId());
        Set<CreditArticles> creditArticles = new HashSet<>();

        for (CreditArticles newOne : credit.getArticles()) {
            matchWithExistingArticle(newOne, oldOne);

            if (Objects.isNull(newOne.getId())) {
                setNewArticleDefaults(newOne, now, credit.getCollector());
            }
            creditArticles.add(newOne);
        }

        credit.setArticles(creditArticles);
    }

    private void matchWithExistingArticle(CreditArticles newOne, Credit oldOne) {
        for (CreditArticles existingOne : oldOne.getArticles()) {
            if (newOne.getArticlesId().equals(existingOne.getArticlesId())) {
                newOne.setUnitPrice(existingOne.getUnitPrice());
                newOne.setId(existingOne.getId());
                newOne.setArticles(existingOne.getArticles());
                newOne.setStockItemId(existingOne.getStockItemId());
                break;
            }
        }
    }

    private void setCommercialPricing(CreditArticles article, Articles oneArticle, LocalDate now, String collector) {
        if (!CreditArticleUnitPricePolicy.isUnitPriceMutable(article)) {
            return;
        }
        Double unitPrice = commercialMonthlyStockItemRepository
                .getUnitPriceByArticleId(oneArticle.getId(), now.getMonthValue(), now.getYear(), collector);
        if (unitPrice == null || unitPrice <= 0) {
            throw new CustomValidationException(
                    "Prix moyen de vente à crédit indisponible dans le stock commercial pour l'article : "
                            + oneArticle.getCommercialName());
        }
        article.setUnitPrice(unitPrice);

        Long stockItemId = commercialMonthlyStockItemRepository
                .getIdByArticleId(oneArticle.getId(), now.getMonthValue(), now.getYear(), collector);
        article.setStockItemId(stockItemId);
    }

    private void setNewArticleDefaults(CreditArticles article, LocalDate now, String collector) {
        Articles oneArticle = articlesService.getById(article.getArticlesId());
        article.setArticles(oneArticle);
        setCommercialPricing(article, oneArticle, now, collector);
    }

    private void applyDistributionPricingFromStock(Credit credit, CommercialMonthlyStock monthlyStock) {
        if (CreditArticleUnitPricePolicy.isUnitPriceFrozen(credit.getStatus())) {
            return;
        }
        credit.getArticles().forEach(creditArticle -> {
            CommercialMonthlyStockItem stockItem = monthlyStock.getItems().stream()
                    .filter(item -> item.getArticle().getId().equals(creditArticle.getArticlesId()))
                    .findFirst()
                    .orElseThrow(() -> new CustomValidationException(
                            "Article non trouvé dans le stock du commercial : "
                                    + creditArticle.getArticles().getCommercialName()));

            Double pmp = stockItem.getWeightedAverageUnitPrice();
            if (pmp == null || pmp <= 0) {
                throw new CustomValidationException(
                        "Prix moyen de vente à crédit indisponible dans le stock commercial pour l'article : "
                                + stockItem.getArticle().getCommercialName());
            }
            creditArticle.setUnitPrice(pmp);
            creditArticle.setStockItemId(stockItem.getId());
        });
    }

    private void markPurposeInProgress(Long clientId, CreditPurpose purpose) {
        if (CreditPurpose.BUSINESS.equals(purpose)) {
            clientService.updateBusinessCreditInProgress(clientId, Boolean.TRUE);
        } else if (CreditPurpose.EVENT.equals(purpose)) {
            clientService.updateEventCreditInProgress(clientId, Boolean.TRUE);
        } else {
            clientService.updateCreditStatus(clientId, Boolean.TRUE);
        }
    }

    private void setupCredit(Credit credit, Client client) {
        credit.setUp();
        if (credit.getCreditPurpose() == null) {
            credit.setCreditPurpose(CreditPurpose.PERSONAL);
        }
        if (credit.getTotalAmount() != null && credit.getTotalAmount() > 0) {
            adhesionService.ifPresent(port -> port.assertCreditAllowed(
                    client, credit.getCreditPurpose(), credit.getTotalAmount()));
        }

        credit.setClient(client);
        credit.setType(OperationType.CREDIT);
        credit.checkAdvance();
        credit.setClientType(Objects.nonNull(client.getClientType()) ? client.getClientType() : ClientType.CLIENT);

        if (!StringUtils.hasText(credit.getReference())) {
            credit.setReference(SaleReferenceGenerator.generate(client.getId().toString(), credit.getClientType()));
        }
    }

    private void checkAndUpdateStockCommercial(Credit clientCredit, CommercialMonthlyStock monthlyStock) {
        clientCredit.getArticles().forEach(creditArticles -> {
            CommercialMonthlyStockItem stockItem = monthlyStock.getItems().stream()
                    .filter(item -> item.getArticle().getId().equals(creditArticles.getArticlesId()))
                    .findFirst()
                    .orElseThrow(() -> new CustomValidationException("Article non trouvé dans le stock du commercial : "
                            + creditArticles.getArticles().getCommercialName()));

            if (stockItem.getQuantityRemaining() < creditArticles.getQuantity()) {
                metricsPublisher.ifPresent(m -> m.creditDistributionStockOut(clientCredit.getCollector()));
                throw new CustomValidationException("Stock insuffisant chez le commercial pour l'article : "
                        + creditArticles.getArticles().getCommercialName());
            }

            Integer quantityBefore = stockItem.getQuantityRemaining();

            stockItem.setQuantitySold(stockItem.getQuantitySold() + creditArticles.getQuantity());
            double currentTotalSold = stockItem.getTotalSoldValue() == null ? 0.0 : stockItem.getTotalSoldValue();
            double saleUnitPrice = stockItem.getWeightedAverageUnitPrice() == null ? 0.0
                    : stockItem.getWeightedAverageUnitPrice();
            if (saleUnitPrice <= 0) {
                throw new CustomValidationException(
                        "Prix moyen de vente à crédit indisponible dans le stock commercial pour l'article : "
                                + stockItem.getArticle().getCommercialName());
            }
            if (CreditArticleUnitPricePolicy.isUnitPriceMutable(creditArticles)) {
                creditArticles.setUnitPrice(saleUnitPrice);
            }
            double newTotalSold = currentTotalSold + (creditArticles.getQuantity() * saleUnitPrice);
            stockItem.setTotalSoldValue(newTotalSold);
            double purchasePmp = stockItem.getWeightedAveragePurchasePrice() == null
                    ? 0.0
                    : stockItem.getWeightedAveragePurchasePrice();
            CommercialMonthlyStockCashSalePricing.addMarginToStockItem(
                    stockItem,
                    creditArticles.getQuantity(),
                    saleUnitPrice,
                    purchasePmp);
            creditArticles.setUnitPurchaseCost(purchasePmp);
            stockItem.updateRemaining();

            soldValueHistoryService.ifPresent(svc -> svc.record(
                    stockItem,
                    clientCredit.getId(),
                    clientCredit.getReference(),
                    CommercialStockMovementType.CREDIT_SALE,
                    creditArticles.getQuantity(),
                    saleUnitPrice,
                    saleUnitPrice,
                    currentTotalSold,
                    newTotalSold));

            if (commercialStockMovementService != null) {
                commercialStockMovementService.record(
                        stockItem.getId(),
                        clientCredit.getId(),
                        clientCredit.getReference(),
                        CommercialStockMovementType.CREDIT_SALE,
                        quantityBefore,
                        creditArticles.getQuantity(),
                        stockItem.getQuantityRemaining(),
                        null,
                        monthlyStock.getCollector(),
                        stockItem.getArticle().getId(),
                        stockItem.getArticle().getCommercialName(),
                        stockItem.getWeightedAveragePurchasePrice(),
                        saleUnitPrice,
                        (saleUnitPrice - stockItem.getWeightedAveragePurchasePrice()) * creditArticles.getQuantity(),
                        "CREDIT",
                        clientCredit.getId());
            }

            creditArticles.setStockItemId(stockItem.getId());
        });

        commercialMonthlyStockRepository.save(monthlyStock);
    }

    private void releaseWarehouseStockForCreditStart(Credit credit) {
        List<String> articleOutOfStock = new ArrayList<>();
        credit.getArticles().forEach(article -> {
            if (!article.hasStockAvailable()) {
                articleOutOfStock.add(article.getArticles().getCommercialName());
            }
        });

        if (!articleOutOfStock.isEmpty()) {
            metricsPublisher.ifPresent(m -> m.creditStartStockOut(credit.getCollector()));
            throw new CustomValidationException("Stock manquant pour démarrer le crédit: Articles Manquants: "
                    + String.join("; \n", articleOutOfStock));
        }

        if (credit.getArticles() != null) {
            credit.getArticles().forEach(line -> articlesService.makeStockRelease(
                    line.getArticlesId(),
                    line.getQuantity(),
                    line.getCredit() != null ? line.getCredit().getId() : line.getId()));
        }
    }

    private boolean dualCreditAuthorizationEnabled() {
        return adhesionService.map(AdhesionCreditPort::isDualCreditAuthorizationEnabled).orElse(false);
    }
}
