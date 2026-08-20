package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.dto.StockReceptionDto;
import com.optimize.elykia.core.dto.StockReceptionItemDto;
import com.optimize.elykia.core.dto.StockReceptionListDto;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.expense.ExpenseType;
import com.optimize.elykia.core.entity.stock.StockReception;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.enumaration.ReceptionStatus;
import com.optimize.elykia.core.enumaration.StockHistoryReferenceType;
import com.optimize.elykia.core.mapper.StockReceptionMapper;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.core.repository.StockReceptionItemRepository;
import com.optimize.elykia.core.repository.StockReceptionRepository;
import com.optimize.elykia.core.service.expense.ExpenseService;
import com.optimize.elykia.core.service.store.ArticleHistoryService;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.util.ArticleSortOrder;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.security.services.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    public Page<StockReceptionListDto> getAllReceptions(
            LocalDate startDate,
            LocalDate endDate,
            ReceptionStatus status,
            Pageable pageable) {
        StockReceptionRepository repository = (StockReceptionRepository) getRepository();
        if (startDate != null && endDate != null) {
            return repository.findListByReceptionDateBetween(startDate, endDate, status, pageable);
        }
        return repository.findAllList(status, pageable);
    }

    public Page<StockReceptionListDto> searchReceptions(
            String reference,
            LocalDate receptionDate,
            ReceptionStatus status,
            Pageable pageable) {
        StockReceptionRepository repository = (StockReceptionRepository) getRepository();
        if (reference != null && !reference.isEmpty() && receptionDate != null) {
            return repository.findListByReferenceContainingIgnoreCaseAndReceptionDate(reference, receptionDate, status, pageable);
        }
        if (reference != null && !reference.isEmpty()) {
            return repository.findListByReferenceContainingIgnoreCase(reference, status, pageable);
        }
        if (receptionDate != null) {
            return repository.findListByReceptionDate(receptionDate, status, pageable);
        }
        return repository.findAllList(status, pageable);
    }

    public StockReceptionDto getReceptionById(Long id) {
        StockReception reception = getById(id);
        return mapper.toDto(reception);
    }

    public StockReceptionDto getReceptionByIdWithItems(Long id) {
        StockReception reception = ((StockReceptionRepository) getRepository()).findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
        StockReceptionDto dto = mapper.toDto(reception);
        LinkedHashSet<StockReceptionItemDto> sortedItems = reception.getItems().stream()
                .sorted(ArticleSortOrder.forStockReceptionItems())
                .map(mapper::toItemDto)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        dto.setItems(sortedItems);
        return dto;
    }

    public Page<StockReceptionItemDto> getReceptionItemsById(Long id, Pageable pageable) {
        getById(id);
        return stockReceptionItemRepository
                .findByStockReceptionIdSorted(id, pageable)
                .map(mapper::toItemDto);
    }

    @Transactional
    public StockReceptionDto validateReception(Long id) {
        StockReception reception = ((StockReceptionRepository) getRepository()).findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));

        if (reception.getStatus() != ReceptionStatus.PENDING) {
            throw new CustomValidationException("Seules les réceptions en attente peuvent être validées.");
        }

        User currentUser = userService.getCurrentUser();
        assertManagerOrAdmin(currentUser);

        applyStockReception(reception, currentUser.getUsername());

        reception.setStatus(ReceptionStatus.VALIDATED);
        reception.setValidatedBy(currentUser.getUsername());
        reception.setValidatedAt(LocalDateTime.now());
        update(reception);

        return mapper.toDto(reception);
    }

    @Transactional
    public StockReceptionDto refuseReception(Long id, String reason) {
        StockReception reception = getById(id);

        if (reception.getStatus() != ReceptionStatus.PENDING) {
            throw new CustomValidationException("Seules les réceptions en attente peuvent être refusées.");
        }

        User currentUser = userService.getCurrentUser();
        assertManagerOrAdmin(currentUser);

        reception.setStatus(ReceptionStatus.REFUSED);
        reception.setRefusedBy(currentUser.getUsername());
        reception.setRefusedAt(LocalDateTime.now());
        reception.setRefusalReason(reason);
        update(reception);

        return mapper.toDto(reception);
    }

    @Transactional
    public String cancelReception(Long id) {
        StockReception reception = ((StockReceptionRepository) getRepository()).findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));

        if (ReceptionStatus.CANCELLED.equals(reception.getStatus())) {
            throw new CustomValidationException("Cette réception est déjà annulée.");
        }

        if (ReceptionStatus.REFUSED.equals(reception.getStatus())) {
            throw new CustomValidationException("Une réception refusée ne peut pas être annulée.");
        }

        User currentUser = userService.getCurrentUser();
        final String connectedUser = currentUser.getUsername();

        if (ReceptionStatus.PENDING.equals(reception.getStatus())) {
            assertCanCancelPending(reception, currentUser);
            reception.setStatus(ReceptionStatus.CANCELLED);
            reception.setCancelledBy(connectedUser);
            reception.setCancelledAt(LocalDateTime.now());
            update(reception);
            return "success:true";
        }

        if (ReceptionStatus.VALIDATED.equals(reception.getStatus())) {
            assertAdmin(currentUser);
            reverseValidatedReception(reception, connectedUser);
            reception.setStatus(ReceptionStatus.CANCELLED);
            reception.setCancelledBy(connectedUser);
            reception.setCancelledAt(LocalDateTime.now());
            update(reception);
            return "success:true";
        }

        throw new CustomValidationException("Statut de réception non pris en charge pour l'annulation.");
    }

    void applyStockReception(StockReception reception, String connectedUser) {
        StringBuilder descriptionBuilder = new StringBuilder();

        for (StockReceptionItem item : reception.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());
            double unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : 0.0;
            int quantity = item.getQuantity() != null ? item.getQuantity() : 0;

            StockEntry stockEntry = new StockEntry();
            stockEntry.setArticleId(article.getId());
            stockEntry.setQuantity(quantity);
            stockEntry.setUnitPrice(unitPrice);

            ArticleHistory articleHistory = ArticleHistory.buildEntryHistory(article, stockEntry, connectedUser);
            articleHistory.setBeneficiary(connectedUser);
            articleHistory.setReferenceType(StockHistoryReferenceType.STOCK_RECEPTION);
            articleHistory.setReferenceId(reception.getId());
            articleHistory.setReferenceLabel(reception.getReference());
            articleHistoryService.create(articleHistory);

            stockValuationFacade.registerEntry(
                    article,
                    quantity,
                    unitPrice,
                    ArticleStockLotSourceType.STOCK_RECEPTION,
                    item,
                    reception.getReceptionDate());

            article.makeEntry(quantity);
            article.setPurchasePrice(unitPrice);
            article.setLastRestockDate(LocalDate.now());
            articlesService.update(article);

            double totalLinePrice = unitPrice * quantity;
            if (descriptionBuilder.length() > 0) {
                descriptionBuilder.append(" | ");
            }
            descriptionBuilder.append(article.getCommercialName())
                    .append(" ").append(article.getName())
                    .append(" Qte:").append(quantity)
                    .append(" PU:").append(unitPrice)
                    .append(" Total:").append(totalLinePrice);
        }

        if (reception.getTotalAmount() != null && reception.getTotalAmount() > 0) {
            ExpenseType expenseType = expenseTypeRepository.findByName("Approvisionnement")
                    .orElseThrow(() -> new RuntimeException("Expense Type 'Approvisionnement' not found"));

            ExpenseDto expenseDto = new ExpenseDto();
            expenseDto.setExpenseTypeId(expenseType.getId());
            expenseDto.setAmount(BigDecimal.valueOf(reception.getTotalAmount()));
            expenseDto.setExpenseDate(LocalDate.now());
            expenseDto.setDescription("Commande : " + descriptionBuilder);
            expenseDto.setReference("STOCK-" + System.currentTimeMillis());

            expenseService.createExpense(expenseDto);
        }
    }

    private void reverseValidatedReception(StockReception reception, String connectedUser) {
        validateStockAvailabilityForCancellation(reception);

        for (StockReceptionItem item : reception.getItems()) {
            stockValuationFacade.cancelEntry(item);

            Articles article = item.getArticle();

            ArticleHistory history = ArticleHistory.buildCancelReceptionHistory(
                    article, item.getQuantity(), connectedUser);
            history.setBeneficiary(connectedUser);
            history.setReferenceType(StockHistoryReferenceType.STOCK_RECEPTION);
            history.setReferenceId(reception.getId());
            history.setReferenceLabel(reception.getReference());
            articleHistoryService.create(history);

            article.makeRelease(item.getQuantity());
            articlesService.update(article);
        }

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
    }

    private void assertManagerOrAdmin(User currentUser) {
        boolean isManagerOrAdmin = currentUser.is(UserProfilConstant.GESTIONNAIRE)
                || currentUser.is(UserProfilConstant.ADMIN);
        if (!isManagerOrAdmin) {
            throw new CustomValidationException("Vous n'avez pas le droit de valider ou refuser cette réception.");
        }
    }

    private void assertAdmin(User currentUser) {
        if (!currentUser.is(UserProfilConstant.ADMIN)) {
            throw new CustomValidationException("Seul un administrateur peut annuler une réception validée.");
        }
    }

    private void assertCanCancelPending(StockReception reception, User currentUser) {
        boolean isCreator = reception.getReceivedBy() != null
                && reception.getReceivedBy().equals(currentUser.getUsername());
        boolean isManagerOrAdmin = currentUser.is(UserProfilConstant.GESTIONNAIRE)
                || currentUser.is(UserProfilConstant.ADMIN);

        if (!isCreator && !isManagerOrAdmin) {
            throw new CustomValidationException("Vous n'avez pas le droit d'annuler cette réception en attente.");
        }
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
