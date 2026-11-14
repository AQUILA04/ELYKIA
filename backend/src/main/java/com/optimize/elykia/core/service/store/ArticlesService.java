package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.config.CacheNames;
import com.optimize.elykia.core.dto.ArticlePriceHistoryDto;
import com.optimize.elykia.core.dto.ArticleStateHistoryDto;
import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.dto.StockEntryDto;
import com.optimize.elykia.core.dto.StockValuesDto;
import com.optimize.elykia.core.dto.bi.StockMetricsDto;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.ArticlePriceHistory;
import com.optimize.elykia.core.entity.article.ArticleStateHistory;
import com.optimize.elykia.core.entity.article.ArticleSalePack;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.dto.ArticleSalePackDto;
import com.optimize.elykia.core.repository.ArticleSalePackRepository;
import com.optimize.elykia.core.util.ArticlePackagingRules;
import com.optimize.elykia.core.entity.expense.ExpenseType;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.stock.ReceptionSalePack;
import com.optimize.elykia.core.entity.stock.StockReception;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.ReceptionStatus;
import com.optimize.elykia.core.event.ArticlePriceChangedEvent;
import com.optimize.elykia.core.mapper.ArticlesMapper;
import com.optimize.elykia.core.repository.ArticlePriceHistoryRepository;
import com.optimize.elykia.core.repository.ArticleStateHistoryRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.core.repository.StockReceptionRepository;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.stock.PackagingEntryResolution;
import com.optimize.elykia.core.enumaration.ArticlePackagingType;
import com.optimize.elykia.core.service.expense.ExpenseService;
import com.optimize.elykia.core.service.stock.ArticlePackagingPricingService;
import com.optimize.elykia.core.service.stock.StockValuationFacade;
import com.optimize.elykia.core.monitoring.BusinessMetricsPublisher;
import com.optimize.elykia.core.util.ArticleCodeGenerator;
import com.optimize.elykia.core.util.StockPriceRealignmentParams;
import lombok.Getter;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

@Service
@Transactional(readOnly = true)
public class ArticlesService extends GenericService<Articles, Long> {

    private final ArticlesMapper articlesMapper;
    private final UserService userService;
    @Getter
    private final ArticleHistoryService articleHistoryService;
    private final ExpenseService expenseService;

    private final ExpenseTypeRepository expenseTypeRepository;
    private final StockReceptionRepository stockReceptionRepository;
    private final ArticleStateHistoryRepository articleStateHistoryRepository;
    private final ArticlePriceHistoryRepository articlePriceHistoryRepository;
    private final StockValuationFacade stockValuationFacade;
    private final ArticlePackagingPricingService articlePackagingPricingService;
    private final ArticleSalePackRepository articleSalePackRepository;
    private final ParameterService parameterService;
    private final ApplicationEventPublisher eventPublisher;
    private BusinessMetricsPublisher metricsPublisher;
    private InventoryWarehouseGuard inventoryWarehouseGuard;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setMetricsPublisher(BusinessMetricsPublisher metricsPublisher) {
        this.metricsPublisher = metricsPublisher;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public void setInventoryWarehouseGuard(InventoryWarehouseGuard inventoryWarehouseGuard) {
        this.inventoryWarehouseGuard = inventoryWarehouseGuard;
    }

    private void assertWarehouseStockMutable() {
        if (inventoryWarehouseGuard != null) {
            inventoryWarehouseGuard.assertWarehouseStockMutable();
        }
    }

    protected ArticlesService(ArticlesRepository repository,
            ArticlesMapper articlesMapper,
            UserService userService,
            ArticleHistoryService articleHistoryService,
            ExpenseService expenseService,
            ExpenseTypeRepository expenseTypeRepository,
            StockReceptionRepository stockReceptionRepository,
            ArticleStateHistoryRepository articleStateHistoryRepository,
            ArticlePriceHistoryRepository articlePriceHistoryRepository,
            StockValuationFacade stockValuationFacade,
            ArticlePackagingPricingService articlePackagingPricingService,
            ArticleSalePackRepository articleSalePackRepository,
            ParameterService parameterService,
            ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.articlesMapper = articlesMapper;
        this.userService = userService;
        this.articleHistoryService = articleHistoryService;
        this.expenseService = expenseService;
        this.expenseTypeRepository = expenseTypeRepository;
        this.stockReceptionRepository = stockReceptionRepository;
        this.articleStateHistoryRepository = articleStateHistoryRepository;
        this.articlePriceHistoryRepository = articlePriceHistoryRepository;
        this.stockValuationFacade = stockValuationFacade;
        this.articlePackagingPricingService = articlePackagingPricingService;
        this.articleSalePackRepository = articleSalePackRepository;
        this.parameterService = parameterService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public Articles createArticles(ArticlesDto dto) {
        Articles articles = articlesMapper.toEntity(dto);
        normalizePackagingDefaults(articles);
        articlePackagingPricingService.validateArticlePackaging(articles);
        articles.setCode(ArticleCodeGenerator.generate(articles));
        Articles saved = create(articles);
        syncSalePacks(saved, dto.getSalePacks());
        return saved;

    }

    // AJOUTEZ CETTE MÉTHODE
    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public void resetAllStockQuantities() {
        assertWarehouseStockMutable();
        String username = userService.getCurrentUser().getUsername();
        int page = 0;
        Page<Articles> articlesPage;
        do {
            articlesPage = getAll(PageRequest.of(page, 100));
            for (Articles article : articlesPage.getContent()) {
                articleHistoryService.create(ArticleHistory.buildResetHistory(article, username));
                article.setStockQuantity(0);
                stockValuationFacade.alignLotsToArticleStock(article);
                update(article);
            }
            page++;
        } while (articlesPage.hasNext());
    }

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public Articles resetStockForArticle(Long id) {
        assertWarehouseStockMutable();
        Articles article = getRepository().findByIdForUpdate(id).orElseGet(() -> getById(id));
        if (article.getReservedQuantity() != null && article.getReservedQuantity() > 0) {
            throw new CustomValidationException(
                    "Des quantités sont encore promises à des ventes comptant non livrées.");
        }
        articleHistoryService
                .create(ArticleHistory.buildResetHistory(article, userService.getCurrentUser().getUsername()));
        article.setStockQuantity(0);
        stockValuationFacade.alignLotsToArticleStock(article);
        return update(article);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public Articles updateArticles(ArticlesDto dto, Long id) {
        dto.setId(id);
        Articles articles = articlesMapper.toEntity(dto);
        Articles oldOne = getById(id);
        articles.setStockQuantity(oldOne.getStockQuantity());
        articles.setReservedQuantity(oldOne.getReservedQuantity());
        articles.setCreatedBy(oldOne.getCreatedBy());
        articles.setState(oldOne.getState());
        articles.setCreatedDate(oldOne.getCreatedDate());
        articles.setAverageMonthlySales(oldOne.getAverageMonthlySales());
        articles.setDaysOfStockAvailable(oldOne.getDaysOfStockAvailable());
        articles.setLastRestockDate(oldOne.getLastRestockDate());
        articles.setStockTurnoverRate(oldOne.getStockTurnoverRate());
        articles.setCode(oldOne.getCode());
        articles.setPhotoObjectKey(oldOne.getPhotoObjectKey());
        normalizePackagingDefaults(articles);
        articlePackagingPricingService.validateArticlePackaging(articles);
        if (hasPriceChanged(oldOne, articles)) {
            articlePriceHistoryRepository.save(new ArticlePriceHistory(
                    oldOne,
                    oldOne.getPurchasePrice(), oldOne.getSellingPrice(), oldOne.getCreditSalePrice(),
                    articles.getPurchasePrice(), articles.getSellingPrice(), articles.getCreditSalePrice()));
            publishPriceRealignmentEventIfNeeded(oldOne, articles);
        }
        Articles saved = super.create(articles);
        syncSalePacks(saved, dto.getSalePacks());
        return saved;
    }

    @Transactional(readOnly = true)
    public Articles getReadableArticle(Long id) {
        Articles article = getById(id);
        if (article.getSalePacks() != null) {
            article.getSalePacks().size();
        }
        return article;
    }

    private void publishPriceRealignmentEventIfNeeded(Articles oldOne, Articles updated) {
        if (!parameterService.isEnabled(StockPriceRealignmentParams.ENABLED_KEY)) {
            return;
        }
        boolean commercialSync = Double.compare(oldOne.getCreditSalePrice(), updated.getCreditSalePrice()) != 0;
        boolean tontineSync = Double.compare(oldOne.getSellingPrice(), updated.getSellingPrice()) != 0;
        if (!commercialSync && !tontineSync) {
            return;
        }
        String actingUsername = userService.getCurrentUser() != null
                ? userService.getCurrentUser().getUsername()
                : "system";
        eventPublisher.publishEvent(new ArticlePriceChangedEvent(
                updated.getId(),
                oldOne.getSellingPrice(),
                updated.getSellingPrice(),
                oldOne.getCreditSalePrice(),
                updated.getCreditSalePrice(),
                commercialSync,
                tontineSync,
                actingUsername));
    }

    private void normalizePackagingDefaults(Articles articles) {
        ArticlePackagingRules.normalize(articles);
    }

    private void syncSalePacks(Articles saved, List<ArticleSalePackDto> packs) {
        if (packs == null || saved.getId() == null) {
            return;
        }
        Set<Integer> seen = new HashSet<>();
        for (ArticleSalePackDto pack : packs) {
            if (pack == null || pack.getQuantity() == null || pack.getQuantity() < 2
                    || pack.getSalePrice() == null || pack.getSalePrice() <= 0) {
                throw new CustomValidationException(
                        "Chaque pack indique une quantité d'au moins 2 unités et un prix supérieur à 0.");
            }
            if (!seen.add(pack.getQuantity())) {
                throw new CustomValidationException(
                        "Un seul prix de pack pour la quantité " + pack.getQuantity() + ".");
            }
        }
        articleSalePackRepository.deleteByArticleId(saved.getId());
        Articles ref = new Articles(saved.getId());
        for (ArticleSalePackDto pack : packs) {
            ArticleSalePack entity = new ArticleSalePack();
            entity.setArticle(ref);
            entity.setQuantity(pack.getQuantity());
            entity.setSalePrice(pack.getSalePrice());
            articleSalePackRepository.save(entity);
        }
    }

    private boolean hasPriceChanged(Articles oldOne, Articles updated) {
        return Double.compare(oldOne.getPurchasePrice(), updated.getPurchasePrice()) != 0
                || Double.compare(oldOne.getSellingPrice(), updated.getSellingPrice()) != 0
                || Double.compare(oldOne.getCreditSalePrice(), updated.getCreditSalePrice()) != 0;
    }

    public Page<Articles> elasticSearch(String keyword, Pageable pageable) {
        return getRepository().elasticsearch(keyword, pageable);
    }

    public Page<Articles> elasticSearchEnabled(String keyword, Pageable pageable) {
        return getRepository().elasticsearchEnabled(keyword, pageable);
    }

    @Override
    @Cacheable(cacheNames = CacheNames.ARTICLES_PAGE, key = "'all-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + T(com.optimize.elykia.core.util.PageableCacheKeyHelper).sortKey(#pageable.sort)")
    public Page<Articles> getAll(Pageable pageable) {
        return findByStateNot(State.DELETED, pageable); // Retourne tous les articles (sauf DELETED) pour la vue de gestion
    }

    @Cacheable(cacheNames = CacheNames.ARTICLES_ENABLED_PAGE, key = "'enabled-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + T(com.optimize.elykia.core.util.PageableCacheKeyHelper).sortKey(#pageable.sort)")
    public Page<Articles> getAllEnabled(Pageable pageable) {
        return getRepository().findByState(State.ENABLED, pageable);
    }

    @Cacheable(cacheNames = CacheNames.ARTICLES_ENABLED_LIST)
    public List<Articles> getAllEnabledList() {
        return getRepository().findByState(State.ENABLED);
    }

    @Override
    @Cacheable(cacheNames = CacheNames.ARTICLES_ALL_LIST)
    public List<Articles> getAll() {
        return super.getAll();
    }

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public void disableArticle(Long id) {
        doDisableArticle(id);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public void enableArticle(Long id) {
        doEnableArticle(id);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public void disableArticles(List<Long> ids) {
        ids.forEach(this::doDisableArticle);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public void enableArticles(List<Long> ids) {
        ids.forEach(this::doEnableArticle);
    }

    private void doDisableArticle(Long id) {
        Articles article = getById(id);
        if (article.getStockQuantity() > 0) {
            throw new RuntimeException("Impossible de désactiver un article dont le stock est positif ("
                    + article.getStockQuantity() + ")");
        }
        if (article.getState() != State.DISABLED) {
            State oldState = article.getState();
            article.setState(State.DISABLED);
            update(article);
            articleStateHistoryRepository.save(new ArticleStateHistory(article, oldState, State.DISABLED));
        }
    }

    private void doEnableArticle(Long id) {
        Articles article = getById(id);
        if (article.getState() != State.ENABLED) {
            State oldState = article.getState();
            article.setState(State.ENABLED);
            update(article);
            articleStateHistoryRepository.save(new ArticleStateHistory(article, oldState, State.ENABLED));
        }
    }

    public ArticlesRepository getRepository() {
        return (ArticlesRepository) super.getRepository();
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public boolean deleteSoft(Long id) {
        return super.deleteSoft(id);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public String makeStockEntries(StockEntryDto stockEntryDto) {
        assertWarehouseStockMutable();
        final String connectedUser = userService.getCurrentUser().getUsername();

        AtomicReference<Double> totalCheck = new AtomicReference<>(0.0);

        // Create StockReception (pending manager validation)
        StockReception stockReception = new StockReception();
        stockReception.setStatus(ReceptionStatus.PENDING);
        stockReception.setReceptionDate(LocalDate.now());
        stockReception.setReceivedBy(connectedUser);
        stockReception.setReference("RCP-" + System.currentTimeMillis());

        final boolean fifoEnabled = stockValuationFacade.isFifoEnabled();

        stockEntryDto.getArticleEntries().forEach(stockEntry -> {
            Articles articles = getById(stockEntry.getArticleId());

            StockReceptionItem receptionItem = new StockReceptionItem();
            receptionItem.setArticle(articles);

            if (fifoEnabled) {
                PackagingEntryResolution resolved = articlePackagingPricingService.resolveFifoEntry(articles, stockEntry);
                double unitPrice = stockValuationFacade.resolveEntryUnitPrice(articles, resolved.unitPrice());
                receptionItem.setQuantity(resolved.quantity());
                receptionItem.setUnitPrice(unitPrice);
                receptionItem.setTotalPrice(resolved.totalPrice());
                receptionItem.setEntryPackagingMode(resolved.entryPackagingMode());
                receptionItem.setPackageCount(resolved.packageCount());
                receptionItem.setPackagePrice(resolved.packagePrice());
                receptionItem.setPackagingTypeSnapshot(resolved.packagingTypeSnapshot());
                receptionItem.setUnitsPerPackageSnapshot(resolved.unitsPerPackageSnapshot());
                copySaleSnapshot(receptionItem, articles, stockEntry);
                totalCheck.updateAndGet(v -> v + resolved.totalPrice());
            } else {
                // Legacy : ignore packaging fields ; quantity obligatoire
                if (stockEntry.getQuantity() == null) {
                    throw new CustomValidationException(
                            "La quantité d'entrée pour l'article est obligatoire !");
                }
                double unitPrice = stockValuationFacade.resolveEntryUnitPrice(articles, stockEntry.getUnitPrice());
                receptionItem.setQuantity(stockEntry.getQuantity());
                receptionItem.setUnitPrice(unitPrice);
                receptionItem.setTotalPrice(unitPrice * stockEntry.getQuantity());
                totalCheck.updateAndGet(v -> v + (unitPrice * stockEntry.getQuantity()));
            }

            stockReception.addItem(receptionItem);
        });

        stockReception.setTotalAmount(totalCheck.get());
        stockReceptionRepository.save(stockReception);

        return "success:true";
    }

    private void copySaleSnapshot(StockReceptionItem item, Articles article, com.optimize.elykia.core.dto.StockEntry entry) {
        item.setUnitSalePrice(entry.getUnitSalePrice() != null ? entry.getUnitSalePrice() : article.getSellingPrice());
        item.setWholesaleSalePrice(entry.getWholesaleSalePrice() != null
                ? entry.getWholesaleSalePrice()
                : article.getWholesaleSalePrice());
        item.setHalfWholesaleSalePrice(entry.getHalfWholesaleSalePrice() != null
                ? entry.getHalfWholesaleSalePrice()
                : article.getHalfWholesaleSalePrice());
        item.getSalePacks().clear();
        if (entry.getSalePacks() != null) {
            for (ArticleSalePackDto pack : entry.getSalePacks()) {
                if (pack.getQuantity() != null && pack.getSalePrice() != null) {
                    item.getSalePacks().add(new ReceptionSalePack(pack.getQuantity(), pack.getSalePrice()));
                }
            }
            return;
        }
        if (article.getSalePacks() == null) {
            return;
        }
        for (ArticleSalePack pack : article.getSalePacks()) {
            if (pack.getQuantity() != null && pack.getSalePrice() != null) {
                item.getSalePacks().add(new ReceptionSalePack(pack.getQuantity(), pack.getSalePrice()));
            }
        }
    }

    @Transactional
    public String makeStockRelease(CreditArticles creditArticles) {
        assertWarehouseStockMutable();
        final String connectedUser = userService.getCurrentUser().getUsername();
        Articles articles = getRepository().findByIdForUpdate(creditArticles.getArticlesId())
                .orElseGet(() -> getById(creditArticles.getArticlesId()));
        int quantity = creditArticles.getQuantity() != null ? creditArticles.getQuantity() : 0;
        if (articles.availableQuantity() < quantity) {
            throw new CustomValidationException(
                    "Stock magasin insuffisant pour " + articles.getCommercialName() + ".");
        }
        if (quantity > 0) {
            Long sourceId = creditArticles.getCredit() != null
                    ? creditArticles.getCredit().getId()
                    : creditArticles.getId();
            stockValuationFacade.consume(
                    articles,
                    quantity,
                    ArticleStockLotMovementType.WAREHOUSE_RELEASE,
                    "CREDIT",
                    sourceId);
        }
        ArticleHistory articleHistory = ArticleHistory.buildReleaseHistory(articles, creditArticles.getQuantity(),
                connectedUser);
        articleHistory.setBeneficiary(connectedUser);
        articleHistoryService.create(articleHistory);
        articles.makeRelease(creditArticles.getQuantity());
        update(articles);
        return "success:true";
    }

    public Articles lockById(Long id) {
        return getRepository().findByIdForUpdate(id)
                .orElseThrow(() -> new com.optimize.common.entities.exception.ResourceNotFoundException("resource.not.found"));
    }

    public void reserveWarehouseQuantity(Long articleId, int quantity) {
        if (quantity <= 0) {
            return;
        }
        assertWarehouseStockMutable();
        Articles article = lockById(articleId);
        if (article.availableQuantity() < quantity) {
            throw new CustomValidationException(
                    "Stock magasin insuffisant pour " + article.getCommercialName() + ".");
        }
        article.addReservation(quantity);
        update(article);
    }

    public void releaseWarehouseReservation(Long articleId, int quantity) {
        if (quantity <= 0) {
            return;
        }
        Articles article = lockById(articleId);
        article.releaseReservation(quantity);
        update(article);
    }

    public Page<Articles> getOutOfStock(Pageable pageable) {
        return getRepository().findByStockQuantityEquals(0, pageable);
    }

    public Page<Articles> getNextOutOfStock(Pageable pageable) {
        return getRepository().findByStockQuantityLessThanEqualAndStockQuantityGreaterThan(6, 0, pageable);
    }

    @Transactional(readOnly = true)
    public long countLowStockItems() {
        return getRepository().countLowStockByReorderPoint();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getArticleStockKpis() {
        Map<String, Double> values = getDetailedStockValues();
        long inStockCount = getRepository().countByStockQuantityGreaterThan(0);
        long outOfStockCount = getRepository().countByStockQuantityEquals(0);
        long lowStockCount = countLowStockItems();

        Map<String, Object> kpis = new java.util.LinkedHashMap<>();
        kpis.put("inStockCount", inStockCount);
        kpis.put("lowStockCount", lowStockCount);
        kpis.put("purchaseTotal", values.getOrDefault("purchaseTotal", 0.0));
        kpis.put("creditSaleTotal", values.getOrDefault("creditSaleTotal", 0.0));
        kpis.put("estimatedMargin", values.getOrDefault("combinedTotal", 0.0));
        kpis.put("sellingSaleTotal", values.getOrDefault("sellingSaleTotal", 0.0));
        kpis.put("estimatedSellingMargin", values.getOrDefault("sellingMargin", 0.0));
        kpis.put("outOfStockCount", outOfStockCount);
        return kpis;
    }

    public Map<String, Double> getDetailedStockValues() {
        if (stockValuationFacade.isFifoEnabled()) {
            double purchaseTotal = stockValuationFacade.getTotalStockValuation();
            double creditSaleTotal = stockValuationFacade.getCreditSaleValuationFromLots();
            double sellingSaleTotal = stockValuationFacade.getSellingSaleValuationFromLots();
            double combinedTotal = creditSaleTotal - purchaseTotal;
            double sellingMargin = sellingSaleTotal - purchaseTotal;
            return Map.of(
                    "purchaseTotal", purchaseTotal,
                    "creditSaleTotal", creditSaleTotal,
                    "combinedTotal", combinedTotal,
                    "sellingSaleTotal", sellingSaleTotal,
                    "sellingMargin", sellingMargin);
        }

        StockValuesDto valuesDto = getRepository().getDetailedStockValues();

        // 2. On utilise les getters pour récupérer les valeurs de manière sûre
        double purchaseTotal = valuesDto.getPurchaseTotal() != null ? valuesDto.getPurchaseTotal() : 0.0;
        double creditSaleTotal = valuesDto.getCreditSaleTotal() != null ? valuesDto.getCreditSaleTotal() : 0.0;
        double sellingSaleTotal = valuesDto.getSellingSaleTotal() != null ? valuesDto.getSellingSaleTotal() : 0.0;

        // 3. On fait le calcul
        double combinedTotal = creditSaleTotal - purchaseTotal;
        double sellingMargin = sellingSaleTotal - purchaseTotal;

        // 4. On retourne la Map comme avant
        return Map.of(
                "purchaseTotal", purchaseTotal,
                "creditSaleTotal", creditSaleTotal,
                "combinedTotal", combinedTotal,
                "sellingSaleTotal", sellingSaleTotal,
                "sellingMargin", sellingMargin);
    }

    public List<ArticleStateHistoryDto> getStateHistoryByArticleId(Long articleId) {
        return articleStateHistoryRepository.findByArticle_IdOrderByCreatedDateDesc(articleId)
                .stream()
                .map(sh -> ArticleStateHistoryDto.builder()
                        .id(sh.getId())
                        .previousState(sh.getPreviousState())
                        .newState(sh.getNewState())
                        .createdDate(sh.getCreatedDate())
                        .createdBy(sh.getCreatedBy())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    public List<ArticlePriceHistoryDto> getPriceHistoryByArticleId(Long articleId) {
        return articlePriceHistoryRepository.findByArticle_IdOrderByCreatedDateDesc(articleId)
                .stream()
                .map(ph -> ArticlePriceHistoryDto.builder()
                        .id(ph.getId())
                        .previousPurchasePrice(ph.getPreviousPurchasePrice())
                        .previousSellingPrice(ph.getPreviousSellingPrice())
                        .previousCreditSalePrice(ph.getPreviousCreditSalePrice())
                        .newPurchasePrice(ph.getNewPurchasePrice())
                        .newSellingPrice(ph.getNewSellingPrice())
                        .newCreditSalePrice(ph.getNewCreditSalePrice())
                        .createdDate(ph.getCreatedDate())
                        .createdBy(ph.getCreatedBy())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StockMetricsDto getStockMetrics() {
        Map<String, Double> values = getDetailedStockValues();
        Double totalValue = values.getOrDefault("purchaseTotal", 0.0);

        long totalItems = getRepository().count();
        long outOfStock = getRepository().countByStockQuantityEquals(0);
        long lowStock = countLowStockItems();
        Double avgTurnover = getRepository().getAverageTurnoverRate();

        if (metricsPublisher != null) {
            metricsPublisher.setArticlesOutOfStock((int) outOfStock);
            metricsPublisher.setArticlesLowStock((int) lowStock);

            List<BusinessMetricsPublisher.ArticleStockMetricRow> lowRows = getRepository()
                    .findLowStockByReorderPoint()
                    .stream()
                    .map(a -> new BusinessMetricsPublisher.ArticleStockMetricRow(
                            a.getId(),
                            a.getCommercialName(),
                            a.getStockQuantity() != null ? a.getStockQuantity() : 0,
                            a.getReorderPoint()))
                    .toList();
            metricsPublisher.setLowStockArticleRows(lowRows);

            List<BusinessMetricsPublisher.ArticleStockMetricRow> outRows = getRepository()
                    .findOutOfStock()
                    .stream()
                    .map(a -> new BusinessMetricsPublisher.ArticleStockMetricRow(
                            a.getId(),
                            a.getCommercialName(),
                            0,
                            a.getReorderPoint()))
                    .toList();
            metricsPublisher.setOutOfStockArticleRows(outRows);
        }

        return new StockMetricsDto(
                totalValue,
                (int) totalItems,
                (int) lowStock,
                (int) outOfStock,
                avgTurnover != null ? avgTurnover : 0.0);
    }

}
