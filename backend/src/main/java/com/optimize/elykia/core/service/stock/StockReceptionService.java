package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.StockReceptionDto;
import com.optimize.elykia.core.dto.StockReceptionItemDto;
import com.optimize.elykia.core.dto.StockReceptionListDto;
import com.optimize.elykia.core.entity.stock.StockReception;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.mapper.StockReceptionMapper;
import com.optimize.elykia.core.repository.StockReceptionItemRepository;
import com.optimize.elykia.core.repository.StockReceptionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.optimize.elykia.core.enumaration.ReceptionStatus;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.expense.ExpenseType;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.expense.ExpenseService;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.core.service.store.ArticleHistoryService;
import com.optimize.common.securities.security.services.UserService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class StockReceptionService extends GenericService<StockReception, Long> {

    private final StockReceptionMapper mapper;
    private final StockValuationFacade stockValuationFacade;
    private final ArticlesService articlesService;
    private final ArticleHistoryService articleHistoryService;
    private final ExpenseService expenseService;
    private final ExpenseTypeRepository expenseTypeRepository;
    private final UserService userService;
    private final StockReceptionItemRepository stockReceptionItemRepository;

    public StockReceptionService(
            StockReceptionRepository repository,
            StockReceptionMapper mapper,
            StockValuationFacade stockValuationFacade,
            ArticlesService articlesService,
            ArticleHistoryService articleHistoryService,
            ExpenseService expenseService,
            ExpenseTypeRepository expenseTypeRepository,
            UserService userService,
            StockReceptionItemRepository stockReceptionItemRepository) {
        super(repository);
        this.mapper = mapper;
        this.stockValuationFacade = stockValuationFacade;
        this.articlesService = articlesService;
        this.articleHistoryService = articleHistoryService;
        this.expenseService = expenseService;
        this.expenseTypeRepository = expenseTypeRepository;
        this.userService = userService;
        this.stockReceptionItemRepository = stockReceptionItemRepository;
    }

    public Page<StockReceptionListDto> getAllReceptions(LocalDate startDate, LocalDate endDate, Pageable pageable) {
        StockReceptionRepository repository = (StockReceptionRepository) getRepository();
        if (startDate != null && endDate != null) {
            return repository.findListByReceptionDateBetween(startDate, endDate, pageable);
        }
        return repository.findAllList(pageable);
    }

    public Page<StockReceptionListDto> searchReceptions(String reference, LocalDate receptionDate, Pageable pageable) {
        StockReceptionRepository repository = (StockReceptionRepository) getRepository();
        if (reference != null && !reference.isEmpty() && receptionDate != null) {
            return repository.findListByReferenceContainingIgnoreCaseAndReceptionDate(reference, receptionDate, pageable);
        }
        if (reference != null && !reference.isEmpty()) {
            return repository.findListByReferenceContainingIgnoreCase(reference, pageable);
        }
        if (receptionDate != null) {
            return repository.findListByReceptionDate(receptionDate, pageable);
        }
        return repository.findAllList(pageable);
    }

    public StockReceptionDto getReceptionById(Long id) {
        StockReception reception = getById(id);
        return mapper.toDto(reception);
    }

    public StockReceptionDto getReceptionByIdWithItems(Long id) {
        StockReception reception = getById(id);
        return mapper.toDtoWithItems(reception);
    }

    public Page<StockReceptionItemDto> getReceptionItemsById(Long id, Pageable pageable) {
        getById(id);
        return stockReceptionItemRepository
                .findByStockReceptionId(id, pageable)
                .map(mapper::toItemDto);
    }

    @Transactional
    public String cancelReception(Long id) {
        StockReception reception = getById(id);

        if (ReceptionStatus.CANCELLED.equals(reception.getStatus())) {
            throw new CustomValidationException("Cette réception est déjà annulée.");
        }

        validateStockAvailabilityForCancellation(reception);

        final String connectedUser = userService.getCurrentUser().getUsername();

        for (StockReceptionItem item : reception.getItems()) {
            // 1. Annuler la valorisation (supprime le lot en FIFO, ne fait rien en Legacy)
            stockValuationFacade.cancelEntry(item);

            Articles article = item.getArticle();

            // 2. Historiser l'opération AVANT de mettre à jour le stock
            // (pour avoir l'ancien stock comme initialQuantity)
            ArticleHistory history = ArticleHistory.buildCancelReceptionHistory(
                    article, item.getQuantity(), connectedUser);
            articleHistoryService.create(history);

            // 3. Mettre à jour le stock (Legacy / global)
            article.makeRelease(item.getQuantity());
            articlesService.update(article);
        }

        // 4. Annuler la dépense si applicable (contre-passation)
        if (reception.getTotalAmount() != null && reception.getTotalAmount() > 0) {
            ExpenseType expenseType = expenseTypeRepository.findByName("Approvisionnement")
                    .orElseThrow(() -> new RuntimeException("Expense Type 'Approvisionnement' not found"));

            ExpenseDto expenseDto = new ExpenseDto();
            expenseDto.setExpenseTypeId(expenseType.getId());
            expenseDto.setAmount(BigDecimal.valueOf(-reception.getTotalAmount()));
            expenseDto.setExpenseDate(LocalDate.now());
            expenseDto.setDescription("Annulation de la réception : " + reception.getReference());
            expenseDto.setReference("CANCEL-STOCK-" + System.currentTimeMillis());

            expenseService.createExpense(expenseDto);
        }

        // 5. Mettre à jour le statut
        reception.setStatus(ReceptionStatus.CANCELLED);
        update(reception);

        return "success:true";
    }

    private void validateStockAvailabilityForCancellation(StockReception reception) {
        Map<Long, Integer> requiredQuantityByArticle = new HashMap<>();
        Map<Long, Articles> articlesById = new HashMap<>();

        for (StockReceptionItem item : reception.getItems()) {
            Articles article = item.getArticle();
            if (article == null || item.getQuantity() == null) {
                continue;
            }
            requiredQuantityByArticle.merge(article.getId(), item.getQuantity(), Integer::sum);
            articlesById.putIfAbsent(article.getId(), article);
        }

        List<String> insufficientArticles = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : requiredQuantityByArticle.entrySet()) {
            Articles article = articlesById.get(entry.getKey());
            int available = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
            int required = entry.getValue();
            if (available < required) {
                insufficientArticles.add(
                        article.getCommercialName()
                                + " (disponible: "
                                + available
                                + ", requis: "
                                + required
                                + ")");
            }
        }

        if (!insufficientArticles.isEmpty()) {
            throw new CustomValidationException(
                    "Impossible d'annuler la réception : stock insuffisant pour les articles suivants : "
                            + String.join("; ", insufficientArticles));
        }
    }
}
