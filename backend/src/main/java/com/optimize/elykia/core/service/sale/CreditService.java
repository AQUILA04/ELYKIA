package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.*;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.enumaration.CreditPurpose;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.SolvencyStatus;
import com.optimize.elykia.core.mapper.CreditMapper;
import com.optimize.elykia.core.repository.*;
import com.optimize.elykia.core.repository.spec.CreditSpecification;
import com.optimize.elykia.core.service.stock.CommercialMonthlyStockItemSoldValueHistoryService;
import com.optimize.elykia.core.service.stock.CommercialStockMovementService;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.accounting.DailyAccountancyService;
import com.optimize.elykia.core.service.bi.BiAggregationService;
import com.optimize.elykia.core.service.stock.StockMovementService;
import com.optimize.elykia.core.service.tontine.TontineStockService;
import com.optimize.elykia.core.util.CreditArticleUnitPricePolicy;
import com.optimize.elykia.core.util.CommercialMonthlyStockCashSalePricing;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.elykia.core.monitoring.BusinessMetricsPublisher;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import com.optimize.elykia.core.dto.BulkChangeCollectorDto;

@Transactional
@Service
@Slf4j
public class CreditService extends GenericService<Credit, Long> {
    private final CreditMapper creditMapper;
    private final ClientService clientService;
    private final UserService userService;
    @Value(value = "${app.credit.dividend}")
    private Integer dividend;
    private final ArticlesService articlesService;
    private final CreditArticlesService creditArticlesService;
    private final DailyAccountancyService dailyAccountancyService;
    private CreditTimelineRepository creditTimelineRepository;
    private final CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    private final CreditCollectorHistoryRepository creditCollectorHistoryRepository;
    private final CreditDailyStakeHistoryRepository creditDailyStakeHistoryRepository;
    private CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;

    // Services BI pour enrichissement automatique
    private CreditEnrichmentService creditEnrichmentService;
    private StockMovementService stockMovementService;
    private BiAggregationService biAggregationService; // Added for real-time aggregation
    private CommercialStockMovementService commercialStockMovementService;
    private CommercialMonthlyStockItemSoldValueHistoryService soldValueHistoryService;
    private TontineStockService tontineStockService;
    private ParameterService parameterService;
    private BusinessMetricsPublisher metricsPublisher;

    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private CreditTimelineService creditTimelineService;

    protected CreditService(CreditRepository repository,
            CreditMapper creditMapper,
            ClientService clientService,
            ArticlesService articlesService,
            CreditArticlesService creditArticlesService,
            UserService userService,
            DailyAccountancyService dailyAccountancyService,
            CommercialMonthlyStockRepository commercialMonthlyStockRepository,
            CreditCollectorHistoryRepository creditCollectorHistoryRepository,
            CreditDailyStakeHistoryRepository creditDailyStakeHistoryRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.creditMapper = creditMapper;
        this.clientService = clientService;
        this.articlesService = articlesService;
        this.creditArticlesService = creditArticlesService;
        this.userService = userService;
        this.dailyAccountancyService = dailyAccountancyService;
        this.commercialMonthlyStockRepository = commercialMonthlyStockRepository;
        this.creditCollectorHistoryRepository = creditCollectorHistoryRepository;
        this.creditDailyStakeHistoryRepository = creditDailyStakeHistoryRepository;
        this.eventPublisher = eventPublisher;
    }

    @Autowired
    public void setCreditEnrichmentService(CreditEnrichmentService creditEnrichmentService) {
        this.creditEnrichmentService = creditEnrichmentService;
    }

    @Autowired
    public void setStockMovementService(StockMovementService stockMovementService) {
        this.stockMovementService = stockMovementService;
    }

    @Autowired
    public void setBiAggregationService(BiAggregationService biAggregationService) {
        this.biAggregationService = biAggregationService;
    }

    @Autowired
    public void setCommercialStockMovementService(CommercialStockMovementService commercialStockMovementService) {
        this.commercialStockMovementService = commercialStockMovementService;
    }

    @Autowired(required = false)
    public void setSoldValueHistoryService(CommercialMonthlyStockItemSoldValueHistoryService soldValueHistoryService) {
        this.soldValueHistoryService = soldValueHistoryService;
    }

    @Transactional
    public CreditRespDto createCredit(CreditDto creditDto) {
        if (Objects.nonNull(creditDto.getType()) && OperationType.CASH.equals(creditDto.getType())) {
            return createCashSale(creditDto);
        }
        CreditPurpose explicitPurpose = creditDto.getCreditPurpose();
        Credit credit = creditMapper.toEntity(creditDto);
        credit.setCreditPurpose(explicitPurpose != null ? explicitPurpose : CreditPurpose.PERSONAL);
        creditControlProcess(credit);
        creditUnicity(credit, explicitPurpose);

        CreditRespDto result = createAndProcessCredit(credit, creditDto.getClientId(), explicitPurpose);
        if (metricsPublisher != null) {
            metricsPublisher.creditCreated(credit.getCollector(),
                    credit.getType() != null ? credit.getType().name() : "CREDIT");
        }
        return result;
    }

    @SneakyThrows
    @Transactional
    public Long transformOrderToCredit(Order order) {
        DistributeArticleDto distributeArticleDto = DistributeArticleDto.fromOrder(order);
        CreditRespDto credit = distributeArticlesV2(distributeArticleDto);
        return credit.id();
    }

    private CreditRespDto createCashSale(CreditDto creditDto) {
        Credit credit = creditMapper.toEntity(creditDto);
        Client client = clientService.getById(credit.getClientId());

        setClient(credit, client);

        if (!StringUtils.hasText(credit.getReference())) {
            String ref = generateReference(client.getId().toString(), credit.getClientType());
            credit.setReference("CSH-" + ref);
        }

        if (Objects.isNull(credit.getId())) {
            credit.getArticles().forEach(article -> {
                article.setArticles(articlesService.getById(article.getArticlesId()));
                article.setUnitPrice(CommercialMonthlyStockCashSalePricing.resolveSaleUnitPrice(article));
            });
        }

        credit.setTotalAmount(credit.getTotalAmountByCalcul());
        credit.setAdvance(0.0);
        credit.setTotalAmountPaid(credit.getTotalAmount());
        credit.setTotalAmountRemaining(0.0);
        credit.setDailyStake(credit.getTotalAmount());
        credit.setRemainingDaysCount(0);
        credit.setBeginDate(LocalDate.now());
        credit.setExpectedEndDate(LocalDate.now());
        credit.setEffectiveEndDate(LocalDate.now());
        credit.setStatus(CreditStatus.VALIDATED);

        credit = super.create(credit);
        // FORCE DB WRITE
        repository.saveAndFlush(credit);
        
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        updateStockForCashSale(credit);
        filledRecovery(credit);
        return CreditRespDto.fromCredit(credit);
    }

    /**
     * Enregistre un recouvrement pour une vente comptant ou une vente de tontine
     * @param credit la vente comptant ou tontine
     */
    private void filledRecovery(Credit credit) {
        var timeline = new CreditTimelineDto();
        timeline.setCreditId(credit.getId());
        timeline.setCollector(credit.getCollector());
        timeline.setAmount(credit.getTotalAmount());
        timeline.setNormalStake(Boolean.FALSE);
        creditTimelineService.makeDailyStake(timeline);
    }

    @Transactional
    public void createTontineCredit(TontineDelivery delivery) {
        Credit credit = Credit.buildFromDelivery(delivery);
        String baseReference = generateReference(
                String.valueOf(delivery.getTontineMember().getClient().getId()),
                ClientType.CLIENT);
        credit.setReference("T" + baseReference);
        tontineStockService.validateTontineStockAvailability(credit.getArticles(), credit.getCollector());
        credit.start();
        credit = super.create(credit);
        this.marginAndBIAggregationOperation(credit);
        // Save CreditArticles
        credit.setCreditToCreditArticles(); // Ensure relationship is set
        credit.getArticles().forEach(creditArticlesService::create);
        tontineStockService.deductTontineStockForDelivery(
                credit.getArticles(),
                credit.getCollector(),
                credit.getId(),
                credit.getReference(),
                delivery);
        credit.getArticles().forEach(creditArticle -> {
            if (creditArticle.getId() != null && creditArticle.getTontineItemId() != null) {
                creditArticlesService.update(creditArticle);
            }
        });
        filledRecovery(credit);
        CreditRespDto.fromCredit(credit);
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
            if (getRepository().hasCreditInProgress(clientId)) {
                if (metricsPublisher != null) {
                    metricsPublisher.creditCreationFailed("DUPLICATE_IN_PROGRESS");
                }
                throw new CustomValidationException("Le client " + credit.getClient().getFullName()
                        + " possède déjà une vente en cours et ne peut donc pas bénéficier d'une autre vente !");
            }
            return;
        }
        if (getRepository().hasCreditInProgressForPurpose(clientId, explicitPurpose)) {
            if (metricsPublisher != null) {
                metricsPublisher.creditCreationFailed("DUPLICATE_IN_PROGRESS");
            }
            throw new CustomValidationException("Le client " + credit.getClient().getFullName()
                    + " possède déjà une vente " + explicitPurpose + " en cours !");
        }
        if (CreditPurpose.BUSINESS.equals(explicitPurpose)) {
            Client client = credit.getClient();
            if (client == null) {
                client = clientService.getById(clientId);
            }
            if (!client.isBusinessCreditAuthorized()) {
                throw new CustomValidationException("Ce client n'est pas habilité pour un crédit professionnel.");
            }
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
            if (!getRepository().hasCreditInProgressForPurpose(clientId, CreditPurpose.BUSINESS)) {
                clientService.updateBusinessCreditInProgress(clientId, Boolean.FALSE);
            }
        }
        if (!getRepository().hasCreditInProgressForPurpose(clientId, CreditPurpose.PERSONAL)) {
            clientService.updateCreditStatus(clientId, Boolean.FALSE);
        }
    }

    private CreditRespDto createAndProcessCredit(Credit credit, Long clientId, CreditPurpose explicitPurpose) {
        credit = super.create(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        if (CreditPurpose.BUSINESS.equals(explicitPurpose)) {
            clientService.updateBusinessCreditInProgress(clientId, Boolean.TRUE);
        } else {
            clientService.updateCreditStatus(clientId, Boolean.TRUE);
        }

        // Enrichissement BI automatique
        if (creditEnrichmentService != null) {
            creditEnrichmentService.enrichCredit(credit);
            credit = super.update(credit);
        }

        return CreditRespDto.fromCredit(creditEnrichment(credit));
    }

    public Credit creditEnrichment(Credit credit) {
        if (creditEnrichmentService != null) {
            creditEnrichmentService.enrichCredit(credit);
            return super.update(credit);
        }
        return credit;
    }

    @Transactional
    public CreditRespDto updateCredit(CreditDto creditDto, Long id) {
        creditDto.setId(id);
        final Credit oldOne = getById(id);

        if (OperationType.CASH.equals(oldOne.getType())) {
            return updateCashSale(creditDto, id);
        }

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
        credit = super.update(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        return CreditRespDto.fromCredit(credit);
    }

    @Transactional
    public CreditRespDto updateCashSale(CreditDto creditDto, Long id) {
        creditDto.setId(id);
        Credit credit = creditMapper.toEntity(creditDto);
        final Credit oldOne = getById(id);

        if (!CreditStatus.VALIDATED.equals(oldOne.getStatus())) {
            throw new CustomValidationException("Cette vente au comptant ne peut plus être modifiée !");
        }

        if (!OperationType.CASH.equals(oldOne.getType())) {
            throw new CustomValidationException("Cette méthode ne permet de modifier que les ventes au comptant !");
        }

        Client client;
        client = clientService.getById(credit.getClientId());
        setClient(credit, client);

        if (!StringUtils.hasText(credit.getReference())) {
            credit.setReference(oldOne.getReference());
        }

        credit.getArticles().forEach(article -> {
            article.setArticles(articlesService.getById(article.getArticlesId()));
            article.setUnitPrice(CommercialMonthlyStockCashSalePricing.resolveSaleUnitPrice(article));
        });

        credit.setTotalAmount(credit.getTotalAmountByCalcul());
        credit.setTotalAmountPaid(credit.getTotalAmount());
        credit.setTotalAmountRemaining(0.0);
        credit.setAdvance(0.0);
        credit.setDailyStake(0.0);
        credit.setRemainingDaysCount(0);

        if (credit.getBeginDate() == null) {
            credit.setBeginDate(oldOne.getBeginDate());
        }
        credit.setExpectedEndDate(credit.getBeginDate());
        credit.setEffectiveEndDate(credit.getBeginDate());

        credit.setStatus(CreditStatus.VALIDATED);

        oldOne.getArticles().forEach(creditArticlesService::delete);

        credit = super.update(credit);
        // FORCE DB WRITE
        repository.saveAndFlush(credit);

        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);

        return CreditRespDto.fromCredit(credit);
    }

    private void setClient(Credit credit, Client client) {
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


    private void setupCredit(Credit credit, Client client) {
        credit.setUp();

        if (parameterService.isEnabled("ENABLED_ACCOUNT_BALANCE_CONTROL")) {
            client.hasValidAccount();
            client.allowCreditAmountControl(credit.getTotalAmount(), dividend);
        }

        credit.setClient(client);
        credit.setType(OperationType.CREDIT);
        credit.checkAdvance();

        credit.setClientType(Objects.nonNull(client.getClientType()) ? client.getClientType() : ClientType.CLIENT);

        if (!StringUtils.hasText(credit.getReference())) {
            credit.setReference(generateReference(client.getId().toString(), credit.getClientType()));
        }
    }

    public boolean changeDailyStake(ChangeDailyStakeDto dto) {
        Credit credit = getById(dto.creditId());

        CreditDailyStakeHistory history = new CreditDailyStakeHistory();
        history.setCredit(credit);
        history.setOldDailyStake(credit.getDailyStake());
        history.setNewDailyStake(dto.dailyStake());
        history.setChangeDate(java.time.LocalDateTime.now());
        history.setAmountRemaining(credit.getTotalAmountRemaining());
        creditDailyStakeHistoryRepository.save(history);

        credit.changeDailyStake(dto.dailyStake());
        repository.saveAndFlush(credit);
        if (metricsPublisher != null) {
            metricsPublisher.creditDailyStakeChanged(credit.getId());
        }
        return Boolean.TRUE;
    }

    public List<CreditDailyStakeHistoryDto> getDailyStakeHistory(Long creditId) {
        return creditDailyStakeHistoryRepository.findByCreditIdOrderByChangeDateDesc(creditId)
                .stream()
                .map(CreditDailyStakeHistoryDto::fromEntity)
                .toList();
    }

    @Transactional
    public CreditRespDto distributeArticlesV2(DistributeArticleDto dto) {
        dto.validateEntryArticles();
        // Dans la V2, on ne dépend plus d'un crédit parent (sortie stock)
        // On vérifie directement le stock mensuel du commercial

        Client client = clientService.getById(dto.getClientId());
        client.validateClientOperation();
        // Récupérer le stock mensuel du commercial
        CommercialMonthlyStock monthlyStock = commercialMonthlyStockRepository
                .getCommercialMonthStock(client.getCollector());

        Credit clientCredit = Credit.buildDistribution(client, dto);
        creditControlProcess(clientCredit);
        applyDistributionPricingFromStock(clientCredit, monthlyStock);
        if (!clientCredit.isMobileFinancialTermsLocked()) {
            clientCredit.setTotalAmount(clientCredit.getTotalAmountByCalcul());
        }
        CreditPurpose explicitPurpose = dto.getCreditPurpose();
        creditUnicity(clientCredit, explicitPurpose);

        // Vérification et mise à jour du stock commercial
        this.checkAndUpdateStockCommercial(clientCredit, monthlyStock);

        // Configuration finale du crédit


        if (StringUtils.hasText(dto.getReference())) {
            if (getRepository().existsByReference(dto.getReference())) {
                return CreditRespDto.fromCredit(getRepository().findByReference(dto.getReference()).orElseThrow());
            }
            clientCredit.setReference(dto.getReference());
        }
        clientCredit.validate();
        clientCredit.start();
        repository.saveAndFlush(clientCredit);
        this.marginAndBIAggregationOperation(clientCredit);

        // Mettre à jour le statut du client
        if (CreditPurpose.BUSINESS.equals(explicitPurpose)) {
            clientService.updateBusinessCreditInProgress(client.getId(), Boolean.TRUE);
        } else {
            clientService.updateCreditStatus(client.getId(), Boolean.TRUE);
        }

        return CreditRespDto.fromCredit(clientCredit);
    }

    private void checkAndUpdateStockCommercial(Credit clientCredit, CommercialMonthlyStock monthlyStock) {
        clientCredit.getArticles().forEach(creditArticles -> {
            CommercialMonthlyStockItem stockItem = monthlyStock.getItems().stream()
                    .filter(item -> item.getArticle().getId().equals(creditArticles.getArticlesId()))
                    .findFirst()
                    .orElseThrow(() -> new CustomValidationException("Article non trouvé dans le stock du commercial : "
                            + creditArticles.getArticles().getCommercialName()));

            if (stockItem.getQuantityRemaining() < creditArticles.getQuantity()) {
                if (metricsPublisher != null) {
                    metricsPublisher.creditDistributionStockOut(clientCredit.getCollector());
                }
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

            recordSoldValueHistory(
                    stockItem,
                    clientCredit.getId(),
                    clientCredit.getReference(),
                    CommercialStockMovementType.CREDIT_SALE,
                    creditArticles.getQuantity(),
                    saleUnitPrice,
                    saleUnitPrice,
                    currentTotalSold,
                    newTotalSold);

            // Enregistrement du mouvement de stock
            if (commercialStockMovementService != null) {
                commercialStockMovementService.record(
                        stockItem.getId(),
                        clientCredit.getId(),
                        clientCredit.getReference(),
                        com.optimize.elykia.core.enumaration.CommercialStockMovementType.CREDIT_SALE,
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
                        clientCredit.getId()
                );
            }

            // Set stockItemId in CreditArticles
            creditArticles.setStockItemId(stockItem.getId());
        });

        // Sauvegarde du stock mis à jour
        commercialMonthlyStockRepository.save(monthlyStock);
    }

    private void recordSoldValueHistory(
            CommercialMonthlyStockItem stockItem,
            Long creditId,
            String creditReference,
            CommercialStockMovementType movementType,
            int quantity,
            double saleUnitPrice,
            double weightedAverageUnitPrice,
            double previousTotalSoldValue,
            double newTotalSoldValue) {
        if (soldValueHistoryService != null) {
            soldValueHistoryService.record(
                    stockItem,
                    creditId,
                    creditReference,
                    movementType,
                    quantity,
                    saleUnitPrice,
                    weightedAverageUnitPrice,
                    previousTotalSoldValue,
                    newTotalSoldValue);
        }
    }

    @Transactional
    public Boolean validateCredit(Long creditId) {
        Credit credit = getById(creditId);
        credit.validate();
        repository.saveAndFlush(credit);
        return Boolean.TRUE;
    }

    private void updateStockForCashSale(Credit credit) {
        List<String> articleOutOfStock = new ArrayList<>();
        credit.getArticles().forEach(article -> {
            if (!article.hasStockAvailable()) {
                articleOutOfStock.add(article.getArticles().getCommercialName());
            }
        });

        if (!articleOutOfStock.isEmpty()) {
            if (metricsPublisher != null) {
                metricsPublisher.creditStartStockOut(credit.getCollector());
            }
            throw new CustomValidationException("Stock manquant pour démarrer le crédit: Articles Manquants: "
                    + String.join("; \n", articleOutOfStock));
        }

        // Enregistrement des mouvements de stock
        this.recordMovementForCashSale(credit);

        // Gestion du stock commercial pour les ventes CASH
        this.handleStockCommercialForCashSale(credit);
    }

    @Transactional
    public Boolean startCredit(Long creditId, Boolean distribution) {
        Credit credit = getById(creditId);
        if (Boolean.FALSE.equals(distribution) && !OperationType.TONTINE.equals(credit.getType())) {
            updateStockForCashSale(credit);
        }

        credit.start();
        repository.saveAndFlush(credit);

        // Calculate margin
        this.marginAndBIAggregationOperation(credit);
        return Boolean.TRUE;
    }

    private void recordMovementForCashSale(Credit credit) {
        if (credit.getArticles() != null) {
            credit.getArticles().forEach(articlesService::makeStockRelease);
        }
    }

    private void handleStockCommercialForCashSale(Credit credit) {
        if (OperationType.CASH.equals(credit.getType())) {
            final Credit cashCredit = credit;
            LocalDate now = LocalDate.now();

            // Utiliser agencyCommercial s'il est défini, sinon le collector du crédit
            String commercialUsername = StringUtils.hasText(cashCredit.getAgencyCommercial())
                    ? cashCredit.getAgencyCommercial()
                    : cashCredit.getCollector();

            CommercialMonthlyStock monthlyStock = commercialMonthlyStockRepository
                    .findByCollectorAndMonthAndYear(commercialUsername, now.getMonthValue(), now.getYear())
                    .orElseGet(() -> {
                        CommercialMonthlyStock newStock = new CommercialMonthlyStock();
                        newStock.setCollector(commercialUsername);
                        newStock.setMonth(now.getMonthValue());
                        newStock.setYear(now.getYear());
                        return commercialMonthlyStockRepository.save(newStock);
                    });

            cashCredit.getArticles().forEach(creditArticle -> {
                CommercialMonthlyStockItem stockItem = monthlyStock.getItems().stream()
                        .filter(item -> item.getArticle().getId().equals(creditArticle.getArticlesId()))
                        .findFirst()
                        .orElseGet(() -> {
                            CommercialMonthlyStockItem newItem = new CommercialMonthlyStockItem();
                            newItem.setArticle(creditArticle.getArticles());
                            newItem.setMonthlyStock(monthlyStock);
                            monthlyStock.addItem(newItem);
                            return commercialMonthlyStockItemRepository.save(newItem) ;
                        });

                // Pour une vente CASH, on considère que c'est pris du stock ET vendu
                stockItem.setQuantityTaken(stockItem.getQuantityTaken() + creditArticle.getQuantity());
                stockItem.setQuantitySold(stockItem.getQuantitySold() + creditArticle.getQuantity());

                double saleUnitPrice = CommercialMonthlyStockCashSalePricing.resolveSaleUnitPrice(creditArticle);
                CommercialMonthlyStockCashSalePricing.ensureCreditArticleUnitPrice(creditArticle, saleUnitPrice);
                CommercialMonthlyStockCashSalePricing.initializeStockItemPricingIfAbsent(
                        stockItem, saleUnitPrice, creditArticle.getArticles());

                double currentTotalSold = stockItem.getTotalSoldValue() == null ? 0.0 : stockItem.getTotalSoldValue();
                double newTotalSold = CommercialMonthlyStockCashSalePricing.applySoldValueAndMargin(
                        stockItem, creditArticle.getQuantity(), saleUnitPrice);
                stockItem.updateRemaining();

                double stockPmp = stockItem.getWeightedAverageUnitPrice() == null ? 0.0
                        : stockItem.getWeightedAverageUnitPrice();
                recordSoldValueHistory(
                        stockItem,
                        cashCredit.getId(),
                        cashCredit.getReference(),
                        CommercialStockMovementType.CASH_SALE,
                        creditArticle.getQuantity(),
                        saleUnitPrice,
                        stockPmp,
                        currentTotalSold,
                        newTotalSold);

                // Enregistrement du mouvement de stock CASH
                if (commercialStockMovementService != null) {
                    commercialStockMovementService.record(
                            stockItem.getId(),
                            cashCredit.getId(),
                            cashCredit.getReference(),
                            com.optimize.elykia.core.enumaration.CommercialStockMovementType.CASH_SALE,
                            creditArticle.getQuantity(),
                            creditArticle.getQuantity(),
                            0,
                            null,
                            monthlyStock.getCollector(),
                            stockItem.getArticle().getId(),
                            stockItem.getArticle().getCommercialName(),
                            stockItem.getWeightedAveragePurchasePrice(),
                            saleUnitPrice,
                            (saleUnitPrice - stockItem.getWeightedAveragePurchasePrice()) * creditArticle.getQuantity(),
                            "CREDIT",
                            cashCredit.getId()
                    );
                }
                
                // Set stockItemId in CreditArticles and update it in DB
                creditArticle.setStockItemId(stockItem.getId());
                if (creditArticle.getId() != null) {
                    creditArticlesService.update(creditArticle);
                }
            });
            commercialMonthlyStockRepository.save(monthlyStock);
        }
    }

    private void marginAndBIAggregationOperation(Credit credit) {
        Double totalAmount = credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0;
        Double totalPurchase = credit.getTotalPurchase();
        if (totalPurchase == null || totalPurchase <= 0.0) {
            totalPurchase = credit.calculTotalPurchase();
        }
        Double margin = totalAmount - (totalPurchase != null ? totalPurchase : 0.0);

        // Publish Event
        if (eventPublisher != null && !OperationType.TONTINE.equals(credit.getType())) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.CreditStartedEvent(
                    this,
                    credit.getTotalAmount(),
                    credit.getCollector(), credit.getAdvance(), margin,
                    credit.getClient().getFullName(),
                    credit.getReference()));
        }

        // Real-time aggregation update for BI performance optimization
        if (biAggregationService != null) {
            try {
                biAggregationService.updateSalesAggregation(credit);
            } catch (Exception e) {
                log.error("Error updating sales aggregation: {}", e.getMessage(), e);
                if (metricsPublisher != null) {
                    metricsPublisher.creditBiAggregationError(credit.getReference());
                }
                // Log error but don't fail the main credit operation
                // This ensures aggregation errors don't impact business operations
            }
        }
    }

    public Page<CreditRespDto> elasticsearch(String keyword, Pageable pageable) {
        return CreditRespDto.fromCreditPage(getRepository().elasticsearch(keyword, pageable));
    }

    public Page<DailyUnrecoveredCreditDto> getCreditByCollector(Pageable pageable) {
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER) && !dailyAccountancyService.isOpenCashDesk()) {
            throw new ApplicationException("Aucune caisse ouverte pour l'utilisateur " + user.getUsername());
        }
        LocalDateTime[] dayRange = getCurrentAccountingDayRange();
        return getRepository().findUnrecoveredCreditsForDay(
                CreditStatus.INPROGRESS,
                user.getUsername(),
                ClientType.CLIENT,
                dayRange[0],
                dayRange[1],
                pageable);
    }

    public List<DailyUnrecoveredCreditDto> getCreditByCollector() {
        User user = userService.getCurrentUser();
        if (!dailyAccountancyService.isOpenCashDesk()) {
            throw new ApplicationException("Aucune caisse ouverte pour l'utilisateur " + user.getUsername());
        }
        LocalDateTime[] dayRange = getCurrentAccountingDayRange();
        return getRepository().findUnrecoveredCreditsForDay(
                CreditStatus.INPROGRESS,
                user.getUsername(),
                ClientType.CLIENT,
                dayRange[0],
                dayRange[1]);
    }

    public Map<String, List<DailyUnrecoveredCreditDto>> getCreditByCollectorV2() {
        Map<String, List<DailyUnrecoveredCreditDto>> grouped = new LinkedHashMap<>();
        for (DailyUnrecoveredCreditDto credit : getCreditByCollector()) {
            if (credit.getClientQuarter() != null) {
                grouped.computeIfAbsent(credit.getClientQuarter(), k -> new ArrayList<>())
                        .add(credit);
            }
        }
        return grouped;
    }

    private LocalDateTime[] getCurrentAccountingDayRange() {
        LocalDate accountingDate = LocalDate.now();
        return new LocalDateTime[] {
                accountingDate.atStartOfDay(),
                accountingDate.plusDays(1).atStartOfDay()
        };
    }

    public Page<CreditRespDto> getCreditByCollectors(String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("id").descending());
        
        // 1. Récupérer les DTOs des crédits (sans articles)
        Page<CreditRespDto> creditsPage = getRepository().findCreditsDto(collector, CreditStatus.INPROGRESS, OperationType.CREDIT, State.ENABLED, pageable);

        // 2. Récupérer les IDs des crédits
        List<Long> creditIds = creditsPage.getContent().stream()
                .map(CreditRespDto::id)
                .toList();

        if (creditIds.isEmpty()) {
            return creditsPage;
        }

        // 3. Charger les articles en lot
        Set<CreditArticles> allArticles = creditArticlesService.getRepository().findByCreditIds(creditIds);

        // 4. Grouper les articles par creditId
        Map<Long, Set<CreditArticles>> articlesByCreditId = allArticles.stream()
                .collect(Collectors.groupingBy(ca -> ca.getCredit().getId(), Collectors.toSet()));

        // 5. Associer les articles aux DTOs
        List<CreditRespDto> contentWithArticles = creditsPage.getContent().stream()
                .map(credit -> credit.addArticles(articlesByCreditId.getOrDefault(credit.id(), Collections.emptySet())))
                .toList();

        return new PageImpl<>(contentWithArticles, pageable, creditsPage.getTotalElements());
    }

    public Page<CreditRespDto> getCreditHistoryByCollectors(String collector, Pageable pageable) {
        return getRepository().findByStatusAndCollectorAndClientTypeOrderByClient_quarterAsc(CreditStatus.SETTLED,
                collector, ClientType.CLIENT, pageable);
    }

    public Page<CreditRespDto> getAll(Pageable pageable, String searchTerm) {
        User user = userService.getCurrentUser();
        String collector = null;
        if (user.is(UserProfilConstant.PROMOTER)) {
            collector = user.getUsername();
        }
        
        String effectiveSearchTerm = (searchTerm != null && !searchTerm.trim().isEmpty()) ? searchTerm : null;

        if (Objects.nonNull(effectiveSearchTerm)) {
            return getRepository().findCreditsDtoWithSearch(effectiveSearchTerm, collector, null, OperationType.CREDIT, State.ENABLED, pageable);
        } else {
            return getRepository().findCreditsDto(collector, null, OperationType.CREDIT, State.ENABLED, pageable);
        }
    }

    public Page<Credit> getAllValidatedCredit(String collector, Pageable pageable) {
        if (StringUtils.hasText(collector)) {
            return getRepository().findByStatusAndClientTypeAndCollector(CreditStatus.VALIDATED, ClientType.PROMOTER,
                    collector, pageable);
        }
        return getRepository().findByStatus(CreditStatus.VALIDATED, pageable);
    }

    public Page<Credit> getCreditHistories(Pageable pageable) {
        return getRepository().findByStatusInAndClientType(
                List.of(CreditStatus.INPROGRESS, CreditStatus.DELIVERED, CreditStatus.ENDED, CreditStatus.SETTLED),
                ClientType.PROMOTER, pageable);
    }


    @Override
    public CreditRepository getRepository() {
        return (CreditRepository) repository;
    }

    public ClientDetails getClientDetails(Long clientId) {
        Client client = clientService.getById(clientId);
        ClientDetails clientDetails = new ClientDetails();
        clientDetails.setName(client.getFullName());
        clientDetails.setPhone(client.getPhone());
        clientDetails.setOccupation(client.getOccupation());
        clientDetails.setAddress(client.getAddress());
        clientDetails
                .setAccountNumber(Objects.nonNull(client.getAccount()) ? client.getAccount().getAccountNumber() : null);
        clientDetails.setCollector(client.getCollector());
        clientDetails
                .setTotalInProgressCredit(getRepository().countCreditsByClientId(clientId, CreditStatus.INPROGRESS));
        clientDetails.setTotalCreditClosed(getRepository().countByStatusAndClient_id(CreditStatus.SETTLED, clientId));
        clientDetails.setTotalCreditDelayed(getRepository()
                .countByStatusAndClient_idAndSolvencyNote(CreditStatus.INPROGRESS, clientId, SolvencyStatus.LATE));
        Double totalInProgressCreditAmount = getRepository().getTotalInProgressAmountByClientId(clientId, CreditStatus.INPROGRESS);
        Double totalInProgressAmountCollected = getRepository().getTotalInProgressAmountPaidByClientId(clientId, CreditStatus.INPROGRESS);
        Double totalInProgressAmountDue = getRepository().getTotalAmountDueTodayByClientId(clientId);
        clientDetails.setTotalInProgressCreditAmount(Objects.requireNonNullElse(totalInProgressCreditAmount, 0.0));
        clientDetails.setTotalInProgressAmountCollected(Objects.requireNonNullElse(totalInProgressAmountCollected, 0.0));
        clientDetails.setTotalInProgressAmountDue(Objects.requireNonNullElse(totalInProgressAmountDue, 0.0));
        clientDetails.setTotalAmountRemaining(
                clientDetails.getTotalInProgressCreditAmount() - clientDetails.getTotalInProgressAmountCollected());
        return clientDetails;
    }

    public Page<Credit> getCreditsByClientAndStatus(Long clientId, CreditStatus status, Pageable pageable) {
        return getRepository().findByClient_idAndStatus(clientId, status, pageable);
    }

    public Page<Credit> getCreditsByClientAndStatusIn(Long clientId, List<CreditStatus> statuses, Pageable pageable) {
        return getRepository().findByClient_idAndStatusIn(clientId, statuses, pageable);
    }


    public String generateReference(String clientId, ClientType clientType) {
        String yy = "" + LocalDate.now().getYear();
        String initial = clientType.name().substring(0, 1);
        return initial + yy.substring(2) + clientId + RandomStringUtils.randomNumeric(4);
    }

    public Page<CreditTimeline> getTimelines(Long creditId, Pageable pageable) {
        return creditTimelineRepository.findByCredit_id(creditId, pageable);
    }

    public Page<CreditTimeline> getTimelinesByClient(Long clientId, Pageable pageable) {
        return creditTimelineRepository.findByCredit_Client_Id(clientId, pageable);
    }



    public Page<CreditRespDto> getDelayedCreditsByCommercial(String commercial, Pageable pageable) {
        return CreditRespDto.fromCreditPage(getRepository().getDelayedCredits(commercial, pageable));
    }

    public Page<CreditRespDto> getEndingCreditsByCommercial(String commercial, Pageable pageable) {
        return CreditRespDto.fromCreditPage(getRepository().getEndingCredits(commercial, pageable));
    }

    @Transactional
    @Override
    public boolean deleteSoft(Long id) throws ApplicationException {
        Credit credit = getById(id);
        boolean result = super.deleteSoft(id);
        if (result) {
            syncClientCreditFlagsAfterClose(credit);
        }
        return result;
    }

    public List<StockOutput> getCommercialStockOutput(String commercialUsername) {
        List<StockOutput> stock = getRepository().findActiveCommercialCredits(commercialUsername);
        return stock.stream()
                .map(stockOutput -> stockOutput
                        .addItems(getRepository().findStockOutputItemsByCreditId(stockOutput.id())))
                .toList();
    }

    public void updateReleasePrinted(LocalDate releaseDate) {
        getRepository().updateReleasePrinted(releaseDate);
    }

    @Autowired
    public void setCreditTimelineRepository(CreditTimelineRepository creditTimelineRepository) {
        this.creditTimelineRepository = creditTimelineRepository;
    }

    @Autowired
    public void setCreditTimelineService(CreditTimelineService creditTimelineService) {
        this.creditTimelineService = creditTimelineService;
    }

    @Autowired
    public void setTontineStockService(TontineStockService tontineStockService) {
        this.tontineStockService = tontineStockService;
    }


    @Autowired
    public void setParameterService(ParameterService parameterService) {
        this.parameterService = parameterService;
    }

    @Autowired
    public void setMetricsPublisher(BusinessMetricsPublisher metricsPublisher) {
        this.metricsPublisher = metricsPublisher;
    }

    @Transactional
    public CreditRespDto changeCollector(Long creditId, String newCollector) {
        Credit credit = getById(creditId);

        if (!CreditStatus.INPROGRESS.equals(credit.getStatus())) {
            throw new CustomValidationException(
                    "Le changement de commercial n'est autorisé que pour les ventes en cours (INPROGRESS).");
        }

        // 1. Historiser l'opération
        CreditCollectorHistory history = new CreditCollectorHistory();
        history.setCredit(credit);
        history.setOldCollector(credit.getCollector());
        history.setNewCollector(newCollector);
        history.setTotalAmount(credit.getTotalAmount());
        history.setTotalAmountPaid(credit.getTotalAmountPaid());
        history.setTotalAmountRemaining(credit.getTotalAmountRemaining());
        history.setChangeDate(java.time.LocalDateTime.now());
        creditCollectorHistoryRepository.save(history);

        // 2. Mettre à jour le crédit
        credit.setCollector(newCollector);

        if (metricsPublisher != null) {
            metricsPublisher.creditCollectorChanged(history.getOldCollector(), newCollector);
        }

        // 3. Mettre à jour le recoveryCollector du client
        Client client = credit.getClient();
        if (client != null) {
            client.setRecoveryCollector(newCollector);
            clientService.update(client);
        }

        credit = super.update(credit);
        return CreditRespDto.fromCredit(credit);
    }

    public List<CreditCollectorHistoryDto> getCollectorHistory(Long creditId) {
        return creditCollectorHistoryRepository.findByCreditIdOrderByChangeDateDesc(creditId)
                .stream()
                .map(com.optimize.elykia.core.dto.CreditCollectorHistoryDto::fromEntity)
                .toList();
    }

    @Autowired
    public void setCommercialMonthlyStockItemRepository(CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository) {
        this.commercialMonthlyStockItemRepository = commercialMonthlyStockItemRepository;
    }

    public Page<CreditRespDto> searchCredits(CreditSearchDto dto, Pageable pageable) {
        Page<Credit> page = getRepository().findAll(CreditSpecification.build(dto), pageable);
        return CreditRespDto.fromCreditPage(page);
    }

    @Transactional
    public void bulkChangeCollector(BulkChangeCollectorDto dto) {
        if (dto.getCreditIds() == null || dto.getCreditIds().isEmpty()) {
            return;
        }
        String username = userService.getCurrentUser().getUsername();

        // 1. Historiser l'opération en bulk
        creditCollectorHistoryRepository.bulkInsertHistoryForCredits(dto.getCreditIds(), dto.getNewCollector(), username, username);

        // 2. Mettre à jour les crédits en bulk
        getRepository().bulkUpdateCollector(dto.getCreditIds(), dto.getNewCollector());

        // 3. Mettre à jour le recoveryCollector des clients en bulk
        getRepository().bulkUpdateClientRecoveryCollector(dto.getCreditIds(), dto.getNewCollector());
    }
}