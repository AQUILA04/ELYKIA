package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.StockReturn;
import com.optimize.elykia.core.entity.stock.StockReturnItem;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.elykia.core.util.ArticleSortOrder;
import com.optimize.elykia.core.monitoring.BusinessMetricsPublisher;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.stock.StockReturnListDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.optimize.elykia.core.dto.stock.StockReturnDto;

import java.util.Objects;
import java.util.UUID;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class StockReturnService extends GenericService<StockReturn, Long> {

    private final ArticlesService articlesService;
    private final CommercialMonthlyStockRepository monthlyStockRepository;
    private final CommercialMonthlyStockItemRepository monthlyStockItemRepository;
    private final UserService userService;
    private final StockMovementService stockMovementService;
    private final StockValuationFacade stockValuationFacade;
    private CommercialStockMovementService commercialStockMovementService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private BusinessMetricsPublisher metricsPublisher;

    public StockReturnService(StockReturnRepository repository,
            ArticlesService articlesService,
            CommercialMonthlyStockRepository monthlyStockRepository,
            CommercialMonthlyStockItemRepository monthlyStockItemRepository,
            UserService userService,
            StockMovementService stockMovementService,
            StockValuationFacade stockValuationFacade,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.articlesService = articlesService;
        this.monthlyStockRepository = monthlyStockRepository;
        this.monthlyStockItemRepository = monthlyStockItemRepository;
        this.userService = userService;
        this.stockMovementService = stockMovementService;
        this.stockValuationFacade = stockValuationFacade;
        this.eventPublisher = eventPublisher;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public void setCommercialStockMovementService(CommercialStockMovementService commercialStockMovementService) {
        this.commercialStockMovementService = commercialStockMovementService;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setMetricsPublisher(BusinessMetricsPublisher metricsPublisher) {
        this.metricsPublisher = metricsPublisher;
    }

    public StockReturn createReturn(StockReturn stockReturn) {
        User currentUser = userService.getCurrentUser();
        stockReturn.setStatus(StockReturnStatus.CREATED);

        stockReturn.setReturnDate(LocalDate.now());

        // Associer les articles existants aux items
        for (StockReturnItem item : stockReturn.getItems()) {
            item.setStockReturn(stockReturn);
            if (item.getArticle() != null && item.getArticle().getId() != null) {
                Articles article = articlesService.getOne(item.getArticle().getId())
                        .orElseThrow(() -> new CustomValidationException(
                                "Article non trouvé avec l'ID : " + item.getArticle().getId()));
                item.setArticle(article);
            } else if (item.getArticle() != null && item.getArticle().getName() != null) {
                // Recherche par nom car le frontend envoie le nom dans l'objet article pour
                // l'instant
                // Idéalement, le frontend devrait envoyer l'ID
                Articles article = articlesService.getRepository().findByName(item.getArticle().getName())
                        .orElseThrow(() -> new CustomValidationException(
                                "Article non trouvé : " + item.getArticle().getName()));
                item.setArticle(article);
            }
        }
        repository.save(stockReturn);
        if (metricsPublisher != null) {
            metricsPublisher.stockReturnCreated(stockReturn.getCollector());
        }
        if (currentUser.is(UserProfilConstant.MAGASINIER)) {
            validateReturn(stockReturn.getId());
        }
        return stockReturn;
    }

    public StockReturn validateReturn(Long returnId) {
        StockReturn stockReturn = getByIdForValidation(returnId);
        if (stockReturn.getStatus() != StockReturnStatus.CREATED) {
            throw new CustomValidationException("Le retour a déjà été traité.");
        }

        User currentUser = userService.getCurrentUser();
        stockReturn.setReceivedDate(LocalDate.now());

        if (stockReturn.getTargetStock() != null) {
            updateHistoriqueTargetStock(stockReturn);
        } else {
            updateCommercialMonthlyStock(stockReturn);
        }

        reintegrateToWarehouse(stockReturn, currentUser);

        stockReturn.setStatus(StockReturnStatus.RECEIVED);
        StockReturn saved = repository.save(stockReturn);
        if (metricsPublisher != null) {
            metricsPublisher.stockReturnProcessed(stockReturn.getCollector());
        }

        double totalReturnAmount = stockReturn.getItems().stream()
                .mapToDouble(item -> item.getQuantity() * item.getArticle().getSellingPrice())
                .sum();

        // Publish event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.StockReturnedEvent(
                    this,
                    totalReturnAmount,
                    stockReturn.getCollector(),
                    stockReturn.getId()));
        }

        return saved;
    }

    public void cancelReturn(Long returnId) {
        StockReturn returnRequest = getById(returnId);
        User currentUser = userService.getCurrentUser();

        if (returnRequest.getStatus() != StockReturnStatus.CREATED) {
            throw new CustomValidationException("Seuls les retours au statut CREATED peuvent être annulés.");
        }

        boolean isCreator = returnRequest.getCollector().equals(currentUser.getUsername());
        boolean isStoreKeeper = currentUser.is(UserProfilConstant.MAGASINIER) || currentUser.is(UserProfilConstant.ADMIN);

        if (!isCreator && !isStoreKeeper) {
             throw new CustomValidationException("Vous n'avez pas le droit d'annuler ce retour.");
        }

        returnRequest.setStatus(StockReturnStatus.CANCELLED);
        repository.save(returnRequest);
    }

    public void refuseReturn(Long returnId) {
        StockReturn returnRequest = getById(returnId);
        User currentUser = userService.getCurrentUser();

        if (returnRequest.getStatus() != StockReturnStatus.CREATED) {
             throw new CustomValidationException("Seuls les retours au statut CREATED peuvent être refusés.");
        }

        boolean isStoreKeeper = currentUser.is(UserProfilConstant.MAGASINIER) || currentUser.is(UserProfilConstant.ADMIN);

        if (!isStoreKeeper) {
            throw new CustomValidationException("Vous n'avez pas le droit de refuser ce retour.");
        }

        returnRequest.setStatus(StockReturnStatus.REFUSED);
        repository.save(returnRequest);
    }

    private double updateCommercialMonthlyStock(StockReturn stockReturn) {
        LocalDate date = Objects.nonNull(stockReturn.getTargetStockDate()) ? stockReturn.getTargetStockDate() : LocalDate.now();
        int month = date.getMonthValue();
        int year = date.getYear();

        CommercialMonthlyStock monthlyStock = monthlyStockRepository
                .findByCollectorAndMonthAndYear(stockReturn.getCollector(), month, year)
                .orElseThrow(() -> new CustomValidationException("Aucun stock mensuel trouvé pour ce commercial."));

        double totalReturnAmount = 0.0;

        for (StockReturnItem returnItem : stockReturn.getItems()) {
            Optional<CommercialMonthlyStockItem> existingItem = monthlyStock.getItems().stream()
                    .filter(item -> item.getArticle().getId().equals(returnItem.getArticle().getId()))
                    .findFirst();

            if (existingItem.isPresent()) {
                CommercialMonthlyStockItem item = existingItem.get();
                // Vérifier que le commercial a assez de stock à retourner
                if (item.getQuantityRemaining() < returnItem.getQuantity()) {
                    if (metricsPublisher != null) {
                        metricsPublisher.stockReturnExceedsStock(stockReturn.getCollector());
                    }
                    throw new CustomValidationException(
                            "Quantité retournée supérieure au stock restant pour l'article : "
                                    + item.getArticle().getCommercialName());
                }

                Integer quantityBefore = item.getQuantityRemaining();

                item.setQuantityReturned(item.getQuantityReturned() + returnItem.getQuantity());
                item.updateRemaining();

                // Enregistrement du mouvement de stock RETURN pour le commercial
                if (commercialStockMovementService != null) {
                    commercialStockMovementService.record(
                            item.getId(),
                            null,
                            null,
                            CommercialStockMovementType.RETURN,
                            quantityBefore,
                            returnItem.getQuantity(),
                            item.getQuantityRemaining(),
                            stockReturn.getId(),
                            monthlyStock.getCollector(),
                            item.getArticle().getId(),
                            item.getArticle().getCommercialName(),
                            item.getWeightedAveragePurchasePrice(),
                            item.getWeightedAverageUnitPrice(),
                            (item.getWeightedAverageUnitPrice() - item.getWeightedAveragePurchasePrice()) * returnItem.getQuantity(),
                            "STOCK_RETURN",
                            stockReturn.getId()
                    );
                }
                
                // Set unit price from monthly stock item
                returnItem.setUnitPrice(item.getWeightedAverageUnitPrice());

                monthlyStockItemRepository.save(item);

                // Calculate the value of returned stock based on current PMP
                totalReturnAmount += returnItem.getQuantity() * item.getWeightedAverageUnitPrice();
            } else {
                throw new CustomValidationException("Article non trouvé dans le stock du commercial : "
                        + returnItem.getArticle().getCommercialName());
            }
        }
        monthlyStockRepository.save(monthlyStock);
        return totalReturnAmount;
    }

    @Transactional
    public StockReturn createHistoriqueReturn(StockReturnDto dto) {
        CommercialMonthlyStock targetStock = monthlyStockRepository.findById(dto.getTargetStockId())
                .orElseThrow(() -> new com.optimize.common.entities.exception.ResourceNotFoundException("Stock cible introuvable"));

        if (!targetStock.getCollector().equals(dto.getCommercial())) {
            throw new CustomValidationException("Le stock cible n'appartient pas à ce commercial.");
        }

        LocalDate now = LocalDate.now();
        if (targetStock.getMonth() == now.getMonthValue() && targetStock.getYear() == now.getYear()) {
            throw new CustomValidationException("Impossible de faire un retour historique sur le mois courant.");
        }

        User currentUser = userService.getCurrentUser();
        boolean autoValidate = currentUser.is(UserProfilConstant.MAGASINIER) || currentUser.is(UserProfilConstant.ADMIN);

        StockReturn stockReturn = new StockReturn();
        stockReturn.setReference(generateReference());
        stockReturn.setCollector(dto.getCommercial());
        stockReturn.setTargetStock(targetStock);
        stockReturn.setReturnDate(dto.getReturnDate());
        stockReturn.setNote(dto.getNote());
        stockReturn.setTargetStockDate(targetStock.getCreatedDate().toLocalDate());
        stockReturn.setStatus(autoValidate ? StockReturnStatus.RECEIVED : StockReturnStatus.CREATED);
        if (autoValidate) {
            stockReturn.setReceivedDate(LocalDate.now());
        }

        for (StockReturnDto.StockReturnItemDto itemDto : dto.getItems()) {
            CommercialMonthlyStockItem stockItem = resolveHistoriqueStockItem(targetStock, itemDto);
            validateHistoriqueReturnQuantity(stockItem, itemDto);

            StockReturnItem returnItem = new StockReturnItem();
            returnItem.setStockItem(stockItem);
            returnItem.setArticle(stockItem.getArticle());
            returnItem.setQuantity(itemDto.getQuantity());
            returnItem.setUnitPrice(itemDto.getUnitPrice());
            stockReturn.addItem(returnItem);
        }

        repository.save(stockReturn);

        if (autoValidate) {
            for (StockReturnDto.StockReturnItemDto itemDto : dto.getItems()) {
                CommercialMonthlyStockItem stockItem = resolveHistoriqueStockItem(targetStock, itemDto);
                applyHistoriqueStockItemUpdate(stockReturn, targetStock, stockItem, itemDto.getQuantity());
            }
            monthlyStockRepository.save(targetStock);
            reintegrateToWarehouse(stockReturn, currentUser);
            if (metricsPublisher != null) {
                metricsPublisher.stockReturnProcessed(stockReturn.getCollector());
            }
            if (eventPublisher != null) {
                double totalReturnAmount = stockReturn.getItems().stream()
                        .mapToDouble(item -> item.getQuantity() * item.getArticle().getSellingPrice())
                        .sum();
                eventPublisher.publishEvent(new com.optimize.elykia.core.event.StockReturnedEvent(
                        this,
                        totalReturnAmount,
                        stockReturn.getCollector(),
                        stockReturn.getId()));
            }
        }

        if (metricsPublisher != null) {
            metricsPublisher.stockReturnCreated(stockReturn.getCollector());
        }

        return stockReturn;
    }

    private CommercialMonthlyStockItem resolveHistoriqueStockItem(
            CommercialMonthlyStock targetStock,
            StockReturnDto.StockReturnItemDto itemDto) {
        return targetStock.getItems().stream()
                .filter(i -> i.getId().equals(itemDto.getStockItemId()))
                .findFirst()
                .orElseThrow(() -> new CustomValidationException("Item de stock introuvable"));
    }

    private void validateHistoriqueReturnQuantity(
            CommercialMonthlyStockItem stockItem,
            StockReturnDto.StockReturnItemDto itemDto) {
        if (itemDto.getQuantity() > stockItem.getQuantityRemaining()) {
            throw new CustomValidationException(
                    "Quantité demandée supérieure au stock restant pour l'article : "
                            + stockItem.getArticle().getCommercialName()
                            + ". Dispo: " + stockItem.getQuantityRemaining()
                            + ", Demandé: " + itemDto.getQuantity());
        }
    }

    private void updateHistoriqueTargetStock(StockReturn stockReturn) {
        CommercialMonthlyStock targetStock = stockReturn.getTargetStock();

        for (StockReturnItem returnItem : stockReturn.getItems()) {
            CommercialMonthlyStockItem stockItem = returnItem.getStockItem();
            if (stockItem == null) {
                throw new CustomValidationException("Ligne de retour sans référence au stock cible.");
            }

            if (stockItem.getQuantityRemaining() < returnItem.getQuantity()) {
                if (metricsPublisher != null) {
                    metricsPublisher.stockReturnExceedsStock(stockReturn.getCollector());
                }
                throw new CustomValidationException(
                        "Quantité retournée supérieure au stock restant pour l'article : "
                                + stockItem.getArticle().getCommercialName());
            }

            applyHistoriqueStockItemUpdate(stockReturn, targetStock, stockItem, returnItem.getQuantity());
        }

        monthlyStockRepository.save(targetStock);
    }

    private void applyHistoriqueStockItemUpdate(
            StockReturn stockReturn,
            CommercialMonthlyStock targetStock,
            CommercialMonthlyStockItem stockItem,
            Integer quantity) {
        Integer quantityBefore = stockItem.getQuantityRemaining();
        stockItem.setQuantityReturned(stockItem.getQuantityReturned() + quantity);
        stockItem.updateRemaining();

        if (commercialStockMovementService != null) {
            commercialStockMovementService.record(
                    stockItem.getId(),
                    null,
                    null,
                    CommercialStockMovementType.RETURN,
                    quantityBefore,
                    quantity,
                    stockItem.getQuantityRemaining(),
                    stockReturn.getId(),
                    targetStock.getCollector(),
                    stockItem.getArticle().getId(),
                    stockItem.getArticle().getCommercialName(),
                    stockItem.getWeightedAveragePurchasePrice(),
                    stockItem.getWeightedAverageUnitPrice(),
                    (stockItem.getWeightedAverageUnitPrice() - stockItem.getWeightedAveragePurchasePrice()) * quantity,
                    "STOCK_RETURN",
                    stockReturn.getId());
        }

        monthlyStockItemRepository.save(stockItem);
    }

    private void reintegrateToWarehouse(StockReturn stockReturn, User currentUser) {
        for (StockReturnItem item : stockReturn.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());

            double returnUnitCost = article.getPurchasePrice();
            if (item.getStockItem() != null
                    && item.getStockItem().getWeightedAveragePurchasePrice() != null
                    && item.getStockItem().getWeightedAveragePurchasePrice() > 0) {
                returnUnitCost = item.getStockItem().getWeightedAveragePurchasePrice();
            }

            stockValuationFacade.registerEntry(
                    article,
                    item.getQuantity(),
                    returnUnitCost,
                    ArticleStockLotSourceType.STOCK_RETURN,
                    null,
                    LocalDate.now());

            stockMovementService.recordMovement(
                    article,
                    MovementType.RETURN,
                    item.getQuantity(),
                    "Validation retour stock " + stockReturn.getId(),
                    currentUser.getUsername(),
                    null,
                    returnUnitCost);

            article.makeEntry(item.getQuantity());
            articlesService.update(article);
        }
    }

    private String generateReference() {
        String ref;
        do {
            ref = "RET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (((StockReturnRepository) repository).existsByReference(ref));
        return ref;
    }

    @Override
    public StockReturn getById(Long id) {
        return ((StockReturnRepository) repository).findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }

    private StockReturn getByIdForValidation(Long id) {
        return ((StockReturnRepository) repository).findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }

    public List<StockReturnItem> getItemsById(Long id) {
        StockReturn stockReturn = getById(id);
        return stockReturn.getItems().stream()
                .sorted(ArticleSortOrder.forStockReturnItems())
                .toList();
    }

    public Page<StockReturnListDto> getAll(String collector, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        StockReturnRepository repo = (StockReturnRepository) repository;
        String effectiveCollector = resolveCollector(collector);
        List<StockReturnStatus> statuses = resolveVisibleStatuses();
        return repo.findFilteredList(effectiveCollector, startDate, endDate, statuses, pageable);
    }

    public com.optimize.elykia.core.dto.stock.StockReturnKpiDto getKpis(String collector, LocalDate startDate, LocalDate endDate) {
        StockReturnRepository repo = (StockReturnRepository) repository;
        String effectiveCollector = resolveCollector(collector);
        List<StockReturnStatus> statuses = resolveVisibleStatuses();

        List<Object[]> counts = repo.countByStatusFiltered(effectiveCollector, startDate, endDate, statuses);

        long pending = 0;
        long received = 0;
        long cancelledRefused = 0;

        for (Object[] row : counts) {
            StockReturnStatus status = (StockReturnStatus) row[0];
            long count = (Long) row[1];
            switch (status) {
                case CREATED -> pending = count;
                case RECEIVED -> received = count;
                case CANCELLED, REFUSED -> cancelledRefused += count;
                default -> { }
            }
        }

        return com.optimize.elykia.core.dto.stock.StockReturnKpiDto.builder()
                .total(pending + received + cancelledRefused)
                .pending(pending)
                .received(received)
                .cancelledRefused(cancelledRefused)
                .build();
    }

    private String resolveCollector(String collector) {
        if (collector != null && !collector.isEmpty()) {
            return collector;
        }
        User currentUser = userService.getCurrentUser();
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            return currentUser.getUsername();
        }
        return null;
    }

    private List<StockReturnStatus> resolveVisibleStatuses() {
        return List.of(
                StockReturnStatus.CREATED,
                StockReturnStatus.RECEIVED,
                StockReturnStatus.CANCELLED,
                StockReturnStatus.REFUSED);
    }

    /** @deprecated use {@link #getAll(String, LocalDate, LocalDate, Pageable)} */
    public Page<StockReturnListDto> getAll(String collector, Pageable pageable) {
        return getAll(collector, null, null, pageable);
    }
}
