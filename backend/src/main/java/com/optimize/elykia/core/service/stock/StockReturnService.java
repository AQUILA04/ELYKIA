package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.*;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public StockReturnService(StockReturnRepository repository,
            ArticlesService articlesService,
            CommercialMonthlyStockRepository monthlyStockRepository,
            CommercialMonthlyStockItemRepository monthlyStockItemRepository,
            UserService userService,
            StockMovementService stockMovementService,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.articlesService = articlesService;
        this.monthlyStockRepository = monthlyStockRepository;
        this.monthlyStockItemRepository = monthlyStockItemRepository;
        this.userService = userService;
        this.stockMovementService = stockMovementService;
        this.eventPublisher = eventPublisher;
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
        if (currentUser.is(UserProfilConstant.MAGASINIER)) {
            validateReturn(stockReturn.getId());
        }
        return stockReturn;
    }

    public StockReturn validateReturn(Long returnId) {
        StockReturn stockReturn = getById(returnId);
        if (stockReturn.getStatus() != StockReturnStatus.CREATED) {
            throw new CustomValidationException("Le retour a déjà été traité.");
        }

        User currentUser = userService.getCurrentUser();

        // 1. Mettre à jour le stock mensuel du commercial
        updateCommercialMonthlyStock(stockReturn);

        // Calculate total return amount

        // 2. Réintégrer les articles dans le stock magasin
        for (StockReturnItem item : stockReturn.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());

            stockMovementService.recordMovement(
                    article,
                    MovementType.RETURN,
                    item.getQuantity(),
                    "Validation retour stock " + stockReturn.getId(),
                    currentUser.getUsername(),
                    null);

            article.makeEntry(item.getQuantity());
            articlesService.update(article);

        }

        stockReturn.setStatus(StockReturnStatus.RECEIVED);
        StockReturn saved = repository.save(stockReturn);

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

    private double updateCommercialMonthlyStock(StockReturn stockReturn) {
        LocalDate date = LocalDate.now();
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
                    throw new CustomValidationException(
                            "Quantité retournée supérieure au stock restant pour l'article : "
                                    + item.getArticle().getCommercialName());
                }
                item.setQuantityReturned(item.getQuantityReturned() + returnItem.getQuantity());
                item.updateRemaining();
                
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

    public Page<StockReturn> getAll(String collector, Pageable pageable) {
        Sort sort = Sort.by(Sort.Direction.DESC, "id");
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        if (collector != null && !collector.isEmpty()) {
            return ((StockReturnRepository) repository).findByCollector(collector, pageable);
        }
        User currentUser = userService.getCurrentUser();
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            return ((StockReturnRepository) repository).findByCollector(currentUser.getUsername(), pageable);
        }
        return ((StockReturnRepository) repository)
                .findByStatusIn(List.of(StockReturnStatus.CREATED, StockReturnStatus.RECEIVED), pageable);
    }
}
