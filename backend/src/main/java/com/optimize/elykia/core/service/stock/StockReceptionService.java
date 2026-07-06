package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.StockReceptionDto;
import com.optimize.elykia.core.entity.stock.StockReception;
import com.optimize.elykia.core.mapper.StockReceptionMapper;
import com.optimize.elykia.core.repository.StockReceptionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.optimize.elykia.core.enumaration.ReceptionStatus;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
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

    public StockReceptionService(
            StockReceptionRepository repository,
            StockReceptionMapper mapper,
            StockValuationFacade stockValuationFacade,
            ArticlesService articlesService,
            ArticleHistoryService articleHistoryService,
            ExpenseService expenseService,
            ExpenseTypeRepository expenseTypeRepository,
            UserService userService) {
        super(repository);
        this.mapper = mapper;
        this.stockValuationFacade = stockValuationFacade;
        this.articlesService = articlesService;
        this.articleHistoryService = articleHistoryService;
        this.expenseService = expenseService;
        this.expenseTypeRepository = expenseTypeRepository;
        this.userService = userService;
    }

    public Page<StockReceptionDto> getAllReceptions(LocalDate startDate, LocalDate endDate, Pageable pageable) {
        Page<StockReception> page;
        if (startDate != null && endDate != null) {
            page = ((StockReceptionRepository) getRepository()).findByReceptionDateBetween(startDate, endDate, pageable);
        } else {
            page = getRepository().findAll(pageable);
        }
        return page.map(mapper::toDto);
    }
    
    public Page<StockReceptionDto> searchReceptions(String reference, LocalDate receptionDate, Pageable pageable) {
        Page<StockReception> page;
        if (reference != null && !reference.isEmpty() && receptionDate != null) {
            page = ((StockReceptionRepository) getRepository()).findByReferenceContainingIgnoreCaseAndReceptionDate(reference, receptionDate, pageable);
        } else if (reference != null && !reference.isEmpty()) {
             page = ((StockReceptionRepository) getRepository()).findByReferenceContainingIgnoreCase(reference, pageable);
        } else if (receptionDate != null) {
             page = ((StockReceptionRepository) getRepository()).findByReceptionDate(receptionDate, pageable);
        } else {
            page = getRepository().findAll(pageable);
        }
        return page.map(mapper::toDto);
    }

    public StockReceptionDto getReceptionById(Long id) {
        StockReception reception = getById(id);
        return mapper.toDtoWithItems(reception);
    }

    @Transactional
    public String cancelReception(Long id) {
        StockReception reception = getById(id);

        if (ReceptionStatus.CANCELLED.equals(reception.getStatus())) {
            throw new CustomValidationException("Cette réception est déjà annulée.");
        }

        final String connectedUser = userService.getCurrentUser().getUsername();

        for (StockReceptionItem item : reception.getItems()) {
            // 1. Annuler la valorisation (supprime le lot en FIFO, ne fait rien en Legacy)
            stockValuationFacade.cancelEntry(item);

            // 2. Mettre à jour le stock (Legacy / global)
            Articles article = item.getArticle();
            article.makeRelease(item.getQuantity());
            articlesService.update(article);

            // 3. Historiser l'opération
            ArticleHistory history = ArticleHistory.buildCancelReceptionHistory(
                    article, item.getQuantity(), connectedUser);
            articleHistoryService.create(history);
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
}
