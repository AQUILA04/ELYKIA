package com.optimize.elykia.core.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.dto.StockEntryDto;
import com.optimize.elykia.core.dto.StockValuesDto;
import com.optimize.elykia.core.dto.bi.StockMetricsDto;
import com.optimize.elykia.core.entity.*;
import com.optimize.elykia.core.mapper.ArticlesMapper;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.core.repository.StockReceptionRepository;
import lombok.Getter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
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

    protected ArticlesService(ArticlesRepository repository,
                              ArticlesMapper articlesMapper,
                              UserService userService,
                              ArticleHistoryService articleHistoryService,
                              ExpenseService expenseService,
                              ExpenseTypeRepository expenseTypeRepository,
                              StockReceptionRepository stockReceptionRepository) {
        super(repository);
        this.articlesMapper = articlesMapper;
        this.userService = userService;
        this.articleHistoryService = articleHistoryService;
        this.expenseService = expenseService;
        this.expenseTypeRepository = expenseTypeRepository;
        this.stockReceptionRepository = stockReceptionRepository;
    }

    @Transactional
    public Articles createArticles(ArticlesDto dto) {
        Articles articles = articlesMapper.toEntity(dto);
        return create(articles);

    }

    // AJOUTEZ CETTE MÉTHODE
    @Transactional
    public void resetAllStockQuantities() {
        int page = 0;
        Page<Articles> articlesPage;
        do {
            articlesPage = getAll(PageRequest.of(page, 100));
            articlesPage.getContent().forEach(article -> articleHistoryService.create(ArticleHistory.buildResetHistory(article, userService.getCurrentUser().getUsername())));
            page++;
        } while (articlesPage.hasNext());
        getRepository().resetAllStockQuantities();
    }

    @Transactional
    public Articles resetStockForArticle(Long id) {
        Articles article = getById(id); // Trouve l'article ou lève une exception s'il n'existe pas
        article.setStockQuantity(0); // Met la quantité à zéro
        articleHistoryService.create(ArticleHistory.buildResetHistory(article, userService.getCurrentUser().getUsername()));
        return update(article); // Sauvegarde les changements
    }

    @Transactional
    public Articles updateArticles(ArticlesDto dto, Long id) {
        dto.setId(id);
        Articles articles = articlesMapper.toEntity(dto);
        return create(articles);
    }

    public Page<Articles> elasticSearch(String keyword, Pageable pageable) {
        return getRepository().elasticsearch(keyword, pageable);
    }

    @Override
    public Page<Articles> getAll(Pageable pageable) {
        return getRepository().findByState(State.ENABLED, pageable);
    }

    public ArticlesRepository getRepository() {
        return (ArticlesRepository) super.getRepository();
    }

    @Transactional
    public String makeStockEntries(StockEntryDto stockEntryDto) {
        final String connectedUser = userService.getCurrentUser().getUsername();
        
        AtomicReference<Double> totalCheck = new AtomicReference<>(0.0);
        StringBuilder descriptionBuilder = new StringBuilder();

        // Create StockReception
        StockReception stockReception = new StockReception();
        stockReception.setReceptionDate(LocalDate.now());
        stockReception.setReceivedBy(connectedUser);
        stockReception.setReference("RCP-" + System.currentTimeMillis());

        stockEntryDto.getArticleEntries().forEach(stockEntry -> {
            Articles articles = getById(stockEntry.getArticleId());
            ArticleHistory articleHistory = ArticleHistory.buildEntryHistory(articles, stockEntry, connectedUser);
            articleHistoryService.create(articleHistory);
            articles.makeEntry(stockEntry.getQuantity());
            articles.setLastRestockDate(LocalDate.now());
            update(articles);
            
            // Expense Calculation
            double unitPrice = stockEntry.getUnitPrice() != null ? stockEntry.getUnitPrice() : articles.getPurchasePrice();
            double totalLinePrice = unitPrice * stockEntry.getQuantity();
            totalCheck.updateAndGet(v -> v + totalLinePrice);
            
            if (descriptionBuilder.length() > 0) {
                descriptionBuilder.append(" | ");
            }
            descriptionBuilder.append(articles.getCommercialName())
                    .append(" ").append(articles.getName())
                    .append(" Qte:").append(stockEntry.getQuantity())
                    .append(" PU:").append(unitPrice)
                    .append(" Total:").append(totalLinePrice);

            // Add item to StockReception
            StockReceptionItem item = new StockReceptionItem();
            item.setArticle(articles);
            item.setQuantity(stockEntry.getQuantity());
            item.setUnitPrice(unitPrice);
            item.setTotalPrice(totalLinePrice);
            stockReception.addItem(item);
        });

        stockReception.setTotalAmount(totalCheck.get());
        stockReceptionRepository.save(stockReception);
        
        // Create Expense if amount > 0
        if (totalCheck.get() > 0) {
            ExpenseType expenseType = expenseTypeRepository.findByName("Approvisionnement")
                    .orElseThrow(() -> new RuntimeException("Expense Type 'Approvisionnement' not found"));
            
            ExpenseDto expenseDto = new ExpenseDto();
            expenseDto.setExpenseTypeId(expenseType.getId());
            expenseDto.setAmount(BigDecimal.valueOf(totalCheck.get()));
            expenseDto.setExpenseDate(LocalDate.now());
            expenseDto.setDescription("Commande : " + descriptionBuilder.toString());
            expenseDto.setReference("STOCK-" + System.currentTimeMillis()); 
            
            expenseService.createExpense(expenseDto);
        }
        
        return "success:true";
    }

    @Transactional
    public String makeStockRelease(CreditArticles creditArticles) {
        final String connectedUser = userService.getCurrentUser().getUsername();
        Articles articles = getById(creditArticles.getArticlesId());
        ArticleHistory articleHistory = ArticleHistory.buildReleaseHistory(articles, creditArticles.getQuantity(), connectedUser);
        articleHistoryService.create(articleHistory);
        articles.makeRelease(creditArticles.getQuantity());
        update(articles);
        return "success:true";
    }

    public Page<Articles> getOutOfStock(Pageable pageable) {
        return getRepository().findByStockQuantityEquals(0, pageable);
    }

    public Page<Articles> getNextOutOfStock(Pageable pageable) {
        return getRepository().findByStockQuantityLessThanEqualAndStockQuantityGreaterThan(6, 0, pageable);
    }
    public Map<String, Double> getDetailedStockValues() {
        // 1. On récupère directement l'objet DTO, plus de tableau !
        StockValuesDto valuesDto = getRepository().getDetailedStockValues();

        // 2. On utilise les getters pour récupérer les valeurs de manière sûre
        double purchaseTotal = valuesDto.getPurchaseTotal() != null ? valuesDto.getPurchaseTotal() : 0.0;
        double creditSaleTotal = valuesDto.getCreditSaleTotal() != null ? valuesDto.getCreditSaleTotal() : 0.0;

        // 3. On fait le calcul
        double combinedTotal = creditSaleTotal - purchaseTotal;

        // 4. On retourne la Map comme avant
        return Map.of(
                "purchaseTotal", purchaseTotal,
                "creditSaleTotal", creditSaleTotal,
                "combinedTotal", combinedTotal
        );
    }


    @Transactional(readOnly = true)
    public StockMetricsDto getStockMetrics() {
        Map<String, Double> values = getDetailedStockValues();
        Double totalValue = values.getOrDefault("purchaseTotal", 0.0);

        long totalItems = getRepository().count();
        long outOfStock = getRepository().countByStockQuantityEquals(0);
        // Utilise le seuil de 6 pour "stock faible" cohérent avec getNextOutOfStock
        long lowStock = getRepository().countByStockQuantityLessThanEqualAndStockQuantityGreaterThan(6, 0);
        Double avgTurnover = getRepository().getAverageTurnoverRate();

        return new StockMetricsDto(
                totalValue,
                (int) totalItems,
                (int) lowStock,
                (int) outOfStock,
                avgTurnover != null ? avgTurnover : 0.0
        );
    }



}
