package com.optimize.elykia.core.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.dto.StockEntryDto;
import com.optimize.elykia.core.dto.StockValuesDto;
import com.optimize.elykia.core.dto.bi.StockMetricsDto;
import com.optimize.elykia.core.entity.ArticleHistory;
import com.optimize.elykia.core.entity.Articles;
import com.optimize.elykia.core.entity.CreditArticles;
import com.optimize.elykia.core.mapper.ArticlesMapper;
import com.optimize.elykia.core.repository.ArticlesRepository;
import lombok.Getter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class ArticlesService extends GenericService<Articles, Long> {
    private final ArticlesMapper articlesMapper;
    private final UserService userService;
    @Getter
    private final ArticleHistoryService articleHistoryService;

    protected ArticlesService(ArticlesRepository repository,
                              ArticlesMapper articlesMapper,
                              UserService userService,
                              ArticleHistoryService articleHistoryService) {
        super(repository);
        this.articlesMapper = articlesMapper;
        this.userService = userService;
        this.articleHistoryService = articleHistoryService;
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
        stockEntryDto.getArticleEntries().forEach(stockEntry -> {
            Articles articles = getById(stockEntry.getArticleId());
            ArticleHistory articleHistory = ArticleHistory.buildEntryHistory(articles, stockEntry, connectedUser);
            articleHistoryService.create(articleHistory);
            articles.makeEntry(stockEntry.getQuantity());
            articles.setLastRestockDate(LocalDate.now());
            update(articles);
        });
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
