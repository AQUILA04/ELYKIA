package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.StockRequest;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.StockRequestRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.Map;

import com.optimize.elykia.core.dto.StockRequestExportDTO;
import com.optimize.elykia.core.dto.stock.FifoConsumptionResult;
import com.optimize.elykia.core.dto.PartialDeliveryResponseDTO;
import com.itextpdf.html2pdf.HtmlConverter;
import java.io.ByteArrayOutputStream;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import com.optimize.elykia.core.dto.StockExportPdfContextDto;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.util.MonthEndCalculator;
import com.optimize.elykia.core.util.ArticleSortOrder;
import com.optimize.elykia.core.util.StockRequestDeliveryPricing;
import com.optimize.elykia.core.monitoring.BusinessMetricsPublisher;
import com.optimize.elykia.core.dto.stock.StockRequestListDto;

@Service
@Transactional
@Slf4j
public class StockRequestService extends GenericService<StockRequest, Long> {

    private final ArticlesService articlesService;
    private final CommercialMonthlyStockRepository monthlyStockRepository;
    private final UserService userService;
    private final AccountingDayService accountingDayService;
    private final StockMovementService stockMovementService;
    private final StockValuationFacade stockValuationFacade;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final TemplateEngine templateEngine;
    private CommercialMonthlyStockItemRepository monthlyStockItemRepository;
    private StockReturnRepository stockReturnRepository;
    private CommercialStockMovementService commercialStockMovementService;
    private CommercialMonthlyStockService commercialMonthlyStockService;
    private BusinessMetricsPublisher metricsPublisher;

    public StockRequestService(StockRequestRepository repository,
            ArticlesService articlesService,
            CommercialMonthlyStockRepository monthlyStockRepository,
            UserService userService,
            AccountingDayService accountingDayService,
            StockMovementService stockMovementService,
            StockValuationFacade stockValuationFacade,
            org.springframework.context.ApplicationEventPublisher eventPublisher,
            TemplateEngine templateEngine) {
        super(repository);
        this.articlesService = articlesService;
        this.monthlyStockRepository = monthlyStockRepository;
        this.userService = userService;
        this.accountingDayService = accountingDayService;
        this.stockMovementService = stockMovementService;
        this.stockValuationFacade = stockValuationFacade;
        this.eventPublisher = eventPublisher;
        this.templateEngine = templateEngine;
    }

    @Autowired
    public void setCommercialStockMovementService(CommercialStockMovementService commercialStockMovementService) {
        this.commercialStockMovementService = commercialStockMovementService;
    }

    @Autowired
    public void setCommercialMonthlyStockService(CommercialMonthlyStockService commercialMonthlyStockService) {
        this.commercialMonthlyStockService = commercialMonthlyStockService;
    }

    @Autowired
    public void setMetricsPublisher(BusinessMetricsPublisher metricsPublisher) {
        this.metricsPublisher = metricsPublisher;
    }

    public StockRequest createRequest(StockRequest request, boolean forNextMonth) {
        request.setStatus(StockRequestStatus.CREATED);
        request.setRequestDate(LocalDate.now());

        if (forNextMonth) {
            if (commercialMonthlyStockService != null) {
                commercialMonthlyStockService.closeCurrentMonthStock(request.getCollector());
            }
            MonthEndCalculator.NextMonthDate nextMonthDate = MonthEndCalculator.getNextMonthDate();
            request.setMonth(nextMonthDate.month());
            request.setYear(nextMonthDate.year());
        } else {
            request.setMonth(LocalDate.now().getMonthValue());
            request.setYear(LocalDate.now().getYear());
        }

        // Générer référence
        Long maxId = ((StockRequestRepository) repository).findMaxId();
        long nextId = (maxId != null ? maxId : 0) + 1;

        LocalDate nowRef = LocalDate.now();
        String year = String.format("%04d", nowRef.getYear());
        String month = String.format("%02d", nowRef.getMonthValue());
        String hexId = String.format("%08X", nextId);

        String reference = "REQ-" + year + "-" + month + "-" + hexId;
        request.setReference(reference);

        double totalCreditSalePrice = 0.0;
        double totalPurchasePrice = 0.0;
        LocalDate now = LocalDate.now();

        List<String> unitPriceChange = new ArrayList<>();
        // Initialiser les prix des articles au moment de la création
        for (StockRequestItem item : request.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());
            Double currentUnitPrice = monthlyStockItemRepository
                    .getUnitPriceByArticleId(article.getId(), now.getMonthValue(), now.getYear(), request.getCollector());
            Double availableQuantity = monthlyStockItemRepository
                    .getRemainingQuantityByArticleId(article.getId(), now.getMonthValue(), now.getYear(), request.getCollector());
            currentUnitPrice = Objects.nonNull(currentUnitPrice) ? currentUnitPrice : 0.0;
            availableQuantity = Objects.nonNull(availableQuantity) ? availableQuantity : 0.0;

            if (availableQuantity > 0 && currentUnitPrice != article.getCreditSalePrice()) {
                unitPriceChange.add(article.getCommercialName() + " " + article.getName() + " (Ancien prix: " +
                        currentUnitPrice + ", Nouveau prix: " + article.getCreditSalePrice() + ")");
            }
            item.setArticle(article); // S'assurer que l'article est bien chargé
            item.setItemName(article.getCommercialName() + " " + article.getName());
            item.setUnitPrice(article.getCreditSalePrice());
            item.setPurchasePrice(article.getPurchasePrice());
            item.setStockRequest(request); // Lier l'item à la requête

            totalCreditSalePrice += (item.getUnitPrice() != null ? item.getUnitPrice() : 0.0) * item.getQuantity();
            totalPurchasePrice += (item.getPurchasePrice() != null ? item.getPurchasePrice() : 0.0)
                    * item.getQuantity();
        }

        if (!unitPriceChange.isEmpty()) {
            if (metricsPublisher != null) {
                metricsPublisher.stockRequestPriceConflict(request.getCollector());
            }
            throw new CustomValidationException("Le prix de ces articles en stock pour le commercial ont changé: " + String.join("| ", unitPriceChange) +
                    ". Veuillez faire le retour de stock de ces articles avant de faire une nouvelle demande de sortie");
        }

        if (metricsPublisher != null) {
            metricsPublisher.stockRequestCreated(request.getCollector());
        }

        request.setTotalCreditSalePrice(totalCreditSalePrice);
        request.setTotalPurchasePrice(totalPurchasePrice);

        return repository.save(request);
    }

    public StockRequest createRequest(StockRequest request) {
        return createRequest(request, false);
    }

    public StockRequest updateRequest(Long requestId, StockRequest updateDto) {
        StockRequest request = getById(requestId);
        
        if (request.getStatus() != StockRequestStatus.CREATED && request.getStatus() != StockRequestStatus.VALIDATED) {
            throw new CustomValidationException("Seules les demandes en statut CREATED ou VALIDATED peuvent être modifiées.");
        }

        // Toujours repasser en CREATED après modification pour re-validation
        request.setStatus(StockRequestStatus.CREATED);

        request.setCollector(updateDto.getCollector());

        // Clear existing items using an iterator to avoid ConcurrentModificationException if we were modifying the set, 
        // or we just clear and re-add. Since it's orphanRemoval=true, clearing should delete old ones.
        request.getItems().clear();

        double totalCreditSalePrice = 0.0;
        double totalPurchasePrice = 0.0;
        LocalDate now = LocalDate.now();

        List<String> unitPriceChange = new ArrayList<>();

        for (StockRequestItem item : updateDto.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());
            Double currentUnitPrice = monthlyStockItemRepository
                    .getUnitPriceByArticleId(article.getId(), now.getMonthValue(), now.getYear(), request.getCollector());
            Double availableQuantity = monthlyStockItemRepository
                    .getRemainingQuantityByArticleId(article.getId(), now.getMonthValue(), now.getYear(), request.getCollector());
            currentUnitPrice = Objects.nonNull(currentUnitPrice) ? currentUnitPrice : 0.0;
            availableQuantity = Objects.nonNull(availableQuantity) ? availableQuantity : 0.0;

            if (availableQuantity > 0 && currentUnitPrice != article.getCreditSalePrice()) {
                unitPriceChange.add(article.getCommercialName() + " " + article.getName() + " (Ancien prix: " +
                        currentUnitPrice + ", Nouveau prix: " + article.getCreditSalePrice() + ")");
            }

            StockRequestItem newItem = new StockRequestItem();
            newItem.setArticle(article);
            newItem.setItemName(article.getCommercialName() + " " + article.getName());
            newItem.setUnitPrice(article.getCreditSalePrice());
            newItem.setPurchasePrice(article.getPurchasePrice());
            newItem.setQuantity(item.getQuantity());
            
            request.addItem(newItem);

            totalCreditSalePrice += (newItem.getUnitPrice() != null ? newItem.getUnitPrice() : 0.0) * newItem.getQuantity();
            totalPurchasePrice += (newItem.getPurchasePrice() != null ? newItem.getPurchasePrice() : 0.0) * newItem.getQuantity();
        }

        if (!unitPriceChange.isEmpty()) {
            if (metricsPublisher != null) {
                metricsPublisher.stockRequestPriceConflict(request.getCollector());
            }
            throw new CustomValidationException("Le prix de ces articles en stock pour le commercial ont changé: " + String.join("| ", unitPriceChange) +
                    ". Veuillez faire le retour de stock de ces articles avant de modifier cette demande de sortie");
        }

        request.setTotalCreditSalePrice(totalCreditSalePrice);
        request.setTotalPurchasePrice(totalPurchasePrice);

        return repository.save(request);
    }

    public StockRequest validateRequest(Long requestId) {
        StockRequest request = getById(requestId);
        if (request.getStatus() != StockRequestStatus.CREATED) {
            throw new CustomValidationException("Seules les demandes créées peuvent être validées.");
        }
        request.setStatus(StockRequestStatus.VALIDATED);
        request.setValidationDate(LocalDate.now());
        return repository.save(request);
    }

    public PartialDeliveryResponseDTO deliverRequest(Long requestId) {
        StockRequest request = getByIdForDelivery(requestId);
        if (request.getStatus() != StockRequestStatus.VALIDATED) {
            throw new CustomValidationException("La demande doit être validée avant livraison.");
        }

        User currentUser = userService.getCurrentUser();
        
        List<StockRequestItem> deliverableItems = new ArrayList<>();
        List<StockRequestItem> pendingRequestItems = new ArrayList<>();
        List<PartialDeliveryResponseDTO.DeliveredItemDTO> deliveredItemDTOs = new ArrayList<>();
        List<PartialDeliveryResponseDTO.PendingItemDTO> pendingItemDTOs = new ArrayList<>();

        // 1. Classification
        for (StockRequestItem item : new ArrayList<>(request.getItems())) {
            Articles article = articlesService.getById(item.getArticle().getId());
            if (article.getStockQuantity() >= item.getQuantity()) {
                deliverableItems.add(item);
                deliveredItemDTOs.add(new PartialDeliveryResponseDTO.DeliveredItemDTO(item.getItemName(), item.getQuantity(), item.getUnitPrice()));
            } else if (article.getStockQuantity() > 0) {
                // partial quantity available
                int availableQty = article.getStockQuantity();
                int missingQty = item.getQuantity() - availableQty;
                
                // modify item for available quantity
                item.setQuantity(availableQty);
                deliverableItems.add(item);
                deliveredItemDTOs.add(new PartialDeliveryResponseDTO.DeliveredItemDTO(item.getItemName(), availableQty, item.getUnitPrice()));
                
                // create new item for pending
                StockRequestItem pendingItem = new StockRequestItem();
                pendingItem.setArticle(article);
                pendingItem.setItemName(item.getItemName());
                pendingItem.setQuantity(missingQty);
                pendingItem.setUnitPrice(item.getUnitPrice());
                pendingItem.setPurchasePrice(item.getPurchasePrice());
                pendingRequestItems.add(pendingItem);
                
                pendingItemDTOs.add(new PartialDeliveryResponseDTO.PendingItemDTO(item.getItemName(), missingQty, (double)availableQty, item.getUnitPrice()));
            } else {
                request.removeItem(item);
                
                StockRequestItem pendingItem = new StockRequestItem();
                pendingItem.setArticle(article);
                pendingItem.setItemName(item.getItemName());
                pendingItem.setQuantity(item.getQuantity());
                pendingItem.setUnitPrice(item.getUnitPrice());
                pendingItem.setPurchasePrice(item.getPurchasePrice());
                pendingRequestItems.add(pendingItem);
                
                pendingItemDTOs.add(new PartialDeliveryResponseDTO.PendingItemDTO(item.getItemName(), item.getQuantity(), 0.0, item.getUnitPrice()));
            }
        }

        if (deliverableItems.isEmpty()) {
            if (metricsPublisher != null) {
                metricsPublisher.stockRequestDeliveryFailed(request.getCollector());
            }
            throw new CustomValidationException("Aucun article disponible pour la livraison.");
        }

        // Si tout est OK, procéder aux mouvements pour deliverableItems
        for (StockRequestItem item : deliverableItems) {
            Articles article = articlesService.getById(item.getArticle().getId());

            FifoConsumptionResult consumption = stockValuationFacade.consume(
                    article,
                    item.getQuantity(),
                    ArticleStockLotMovementType.WAREHOUSE_RELEASE,
                    "STOCK_REQUEST",
                    request.getId());

            stockMovementService.recordMovement(
                    article,
                    MovementType.RELEASE,
                    item.getQuantity(),
                    "Livraison demande " + request.getReference(),
                    currentUser.getUsername(),
                    null,
                    consumption.getAverageUnitCost());

            article.makeRelease(item.getQuantity());
            articlesService.update(article);

            StockRequestDeliveryPricing.applyAtDelivery(
                    item,
                    article,
                    stockValuationFacade.isFifoEnabled(),
                    consumption.getAverageUnitCost());
        }

        deliveredItemDTOs.clear();
        for (StockRequestItem item : deliverableItems) {
            deliveredItemDTOs.add(new PartialDeliveryResponseDTO.DeliveredItemDTO(
                    item.getItemName(), item.getQuantity(), item.getUnitPrice()));
        }

        // update totals
        double totalCreditSalePrice = deliverableItems.stream().mapToDouble(i -> i.getQuantity() * (i.getUnitPrice() != null ? i.getUnitPrice() : 0.0)).sum();
        double totalPurchasePrice = deliverableItems.stream().mapToDouble(i -> i.getQuantity() * (i.getPurchasePrice() != null ? i.getPurchasePrice() : 0.0)).sum();
        request.setTotalCreditSalePrice(totalCreditSalePrice);
        request.setTotalPurchasePrice(totalPurchasePrice);

        LocalDate deliveryDate = LocalDate.now();
        request.setDeliveryDate(deliveryDate);
        request.setMonth(deliveryDate.getMonthValue());
        request.setYear(deliveryDate.getYear());
        request.setAccountingDate(deliveryDate);

        // 2. Mettre à jour le stock mensuel du commercial (mois basé sur la date de livraison)
        updateCommercialMonthlyStock(request);

        request.setStatus(StockRequestStatus.DELIVERED);
        StockRequest savedRequest = repository.save(request);

        if (metricsPublisher != null) {
            metricsPublisher.stockRequestDelivered(request.getCollector(), !pendingRequestItems.isEmpty());
        }

        // Calculate margin
        Double margin = (savedRequest.getTotalCreditSalePrice() != null ? savedRequest.getTotalCreditSalePrice() : 0.0)
                - (savedRequest.getTotalPurchasePrice() != null ? savedRequest.getTotalPurchasePrice() : 0.0);

        // Publish Event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.StockRequestDeliveredEvent(
                    this,
                    savedRequest.getTotalCreditSalePrice(),
                    savedRequest.getCollector(),
                    margin,
                    savedRequest.getReference()));
        }

        PartialDeliveryResponseDTO response = new PartialDeliveryResponseDTO();
        response.setDeliveredRequestId(savedRequest.getId());
        response.setDeliveredRequestReference(savedRequest.getReference());
        response.setDeliveredItems(deliveredItemDTOs);

        if (pendingRequestItems.isEmpty()) {
            response.setDeliveryType(PartialDeliveryResponseDTO.DeliveryType.FULL);
            response.setPendingItems(new ArrayList<>());
        } else {
            response.setDeliveryType(PartialDeliveryResponseDTO.DeliveryType.PARTIAL);
            response.setPendingItems(pendingItemDTOs);

            // Create new pending request
            StockRequest pendingRequest = new StockRequest();
            pendingRequest.setCollector(request.getCollector());
            pendingRequest.setRequestDate(LocalDate.now());
            pendingRequest.setValidationDate(LocalDate.now());
            pendingRequest.setStatus(StockRequestStatus.VALIDATED);

            Long maxId = ((StockRequestRepository) repository).findMaxId();
            long nextId = (maxId != null ? maxId : 0) + 1;
            LocalDate nowRef = LocalDate.now();
            String year = String.format("%04d", nowRef.getYear());
            String month = String.format("%02d", nowRef.getMonthValue());
            String hexId = String.format("%08X", nextId);
            pendingRequest.setReference("REQ-" + year + "-" + month + "-" + hexId);

            double pendTotalCreditSale = 0.0;
            double pendTotalPurchase = 0.0;
            
            for (StockRequestItem pi : pendingRequestItems) {
                pendingRequest.addItem(pi);
                pendTotalCreditSale += pi.getQuantity() * (pi.getUnitPrice() != null ? pi.getUnitPrice() : 0.0);
                pendTotalPurchase += pi.getQuantity() * (pi.getPurchasePrice() != null ? pi.getPurchasePrice() : 0.0);
            }
            pendingRequest.setTotalCreditSalePrice(pendTotalCreditSale);
            pendingRequest.setTotalPurchasePrice(pendTotalPurchase);

            StockRequest savedPending = repository.save(pendingRequest);
            response.setPendingRequestId(savedPending.getId());
            response.setPendingRequestReference(savedPending.getReference());
        }

        return response;
    }

    public void cancelRequest(Long requestId) {
        StockRequest request = getById(requestId);
        User currentUser = userService.getCurrentUser();

        if (request.getStatus() != StockRequestStatus.CREATED) {
            throw new CustomValidationException("Seules les demandes au statut CREATED peuvent être annulées.");
        }

        boolean isCreator = request.getCollector().equals(currentUser.getUsername());
        boolean isManager = currentUser.is(UserProfilConstant.GESTIONNAIRE) || currentUser.is(UserProfilConstant.ADMIN);

        if (!isCreator && !isManager) {
             throw new CustomValidationException("Vous n'avez pas le droit d'annuler cette demande.");
        }

        request.setStatus(StockRequestStatus.CANCELLED);
        repository.save(request);
    }

    public void refuseRequest(Long requestId) {
        StockRequest request = getById(requestId);
        User currentUser = userService.getCurrentUser();

        if (request.getStatus() != StockRequestStatus.CREATED) {
             throw new CustomValidationException("Seules les demandes au statut CREATED peuvent être refusées.");
        }

        boolean isManagerOrSecretary = currentUser.is(UserProfilConstant.GESTIONNAIRE) || 
                                       currentUser.is(UserProfilConstant.SECRETARY) ||
                                       currentUser.is(UserProfilConstant.ADMIN);

        if (!isManagerOrSecretary) {
            throw new CustomValidationException("Vous n'avez pas le droit de refuser cette demande.");
        }

        request.setStatus(StockRequestStatus.REFUSED);
        repository.save(request);
    }

    /** Minuit GMT+4 — annulation automatique des demandes stock obsolètes (> 30 jours). */
    @Scheduled(cron = "0 0 0 * * ?")
    @SchedulerLock(name = "autoCancelOldStockRequests", lockAtLeastFor = "PT30S", lockAtMostFor = "PT15M")
    public void autoCancelOldRequests() {
        long start = System.currentTimeMillis();
        LocalDate thresholdDate = LocalDate.now().minusDays(30);
        int cancelled = ((StockRequestRepository) repository).bulkUpdateStatusBeforeDate(
                StockRequestStatus.CREATED, StockRequestStatus.CANCELLED, thresholdDate);
        if (cancelled > 0 && metricsPublisher != null) {
            metricsPublisher.stockRequestAutoCancelled();
        }
        log.info("autoCancelOldRequests: {} demande(s) annulée(s) en {} ms", cancelled, System.currentTimeMillis() - start);
    }

    private void updateCommercialMonthlyStock(StockRequest request) {
        LocalDate stockDate = Objects.nonNull(request.getDeliveryDate()) ? request.getDeliveryDate() : LocalDate.now();
        int month = stockDate.getMonthValue();
        int year = stockDate.getYear();

        CommercialMonthlyStock monthlyStock = monthlyStockRepository
                .findByCollectorAndMonthAndYear(request.getCollector(), month, year)
                .orElseGet(() -> {
                    CommercialMonthlyStock newStock = new CommercialMonthlyStock();
                    newStock.setCollector(request.getCollector());
                    newStock.setMonth(month);
                    newStock.setYear(year);
                    return monthlyStockRepository.save(newStock);
                });

        for (StockRequestItem reqItem : request.getItems()) {
            Optional<CommercialMonthlyStockItem> existingItem = monthlyStock.getItems().stream()
                    .filter(item -> item.getArticle().getId().equals(reqItem.getArticle().getId()))
                    .findFirst();

            CommercialMonthlyStockItem stockItem;
            Integer quantityBefore;

            if (existingItem.isPresent()) {
                stockItem = existingItem.get();
                quantityBefore = stockItem.getQuantityRemaining();

                // Calcul du nouveau prix moyen pondéré
                int currentNetQuantity = stockItem.getQuantityRemaining();
                double currentTotalValue = currentNetQuantity * stockItem.getWeightedAverageUnitPrice();
                double newRequestValue = reqItem.getQuantity() * reqItem.getUnitPrice();
                int newNetQuantity = currentNetQuantity + reqItem.getQuantity();

                if (newNetQuantity > 0) {
                    stockItem.setWeightedAverageUnitPrice(Math.ceil((currentTotalValue + newRequestValue) / newNetQuantity));
                }

                // Idem pour le prix d'achat
                double currentTotalPurchaseValue = currentNetQuantity * stockItem.getWeightedAveragePurchasePrice();
                double newRequestPurchaseValue = reqItem.getQuantity() * reqItem.getPurchasePrice();

                if (newNetQuantity > 0) {
                    stockItem.setWeightedAveragePurchasePrice(
                            Math.ceil((currentTotalPurchaseValue + newRequestPurchaseValue) / newNetQuantity));
                }

                stockItem.setQuantityTaken(stockItem.getQuantityTaken() + reqItem.getQuantity());
                stockItem.setLastUnitPrice(reqItem.getUnitPrice());
                stockItem.setLastPurchasePrice(reqItem.getPurchasePrice());
                stockItem.updateRemaining();
            } else {
                stockItem = new CommercialMonthlyStockItem();
                stockItem.setArticle(reqItem.getArticle());
                stockItem.setMonthlyStock(monthlyStock);
                stockItem.setQuantityTaken(reqItem.getQuantity());
                stockItem.setWeightedAverageUnitPrice(Math.ceil(reqItem.getUnitPrice()));
                stockItem.setWeightedAveragePurchasePrice(Math.ceil(reqItem.getPurchasePrice()));
                stockItem.setLastUnitPrice(reqItem.getUnitPrice());
                stockItem.setLastPurchasePrice(reqItem.getPurchasePrice());
                stockItem.updateRemaining();
                quantityBefore = 0;
                monthlyStock.addItem(stockItem);
                monthlyStockItemRepository.save(stockItem);
            }

            // Enregistrement du mouvement de stock STOCK_IN pour le commercial
            if (commercialStockMovementService != null) {
                commercialStockMovementService.record(
                        stockItem.getId(),
                        null,
                        null,
                        CommercialStockMovementType.STOCK_IN,
                        quantityBefore,
                        reqItem.getQuantity(),
                        stockItem.getQuantityRemaining(),
                        request.getId(),
                        monthlyStock.getCollector(),
                        reqItem.getArticle().getId(),
                        reqItem.getArticle().getCommercialName(),
                        reqItem.getPurchasePrice(),
                        reqItem.getUnitPrice(),
                        (reqItem.getUnitPrice() - reqItem.getPurchasePrice()) * reqItem.getQuantity(),
                        "STOCK_REQUEST",
                        request.getId()
                );
            }
        }
        monthlyStockRepository.save(monthlyStock);
    }

    @Override
    public StockRequest getById(Long id) {
        return ((StockRequestRepository) repository).findByIdWithItems(id)
                .orElseThrow(() -> new com.optimize.common.entities.exception.ResourceNotFoundException("resource.not.found"));
    }

    private StockRequest getByIdForDelivery(Long id) {
        return ((StockRequestRepository) repository).findByIdForUpdate(id)
                .orElseThrow(() -> new com.optimize.common.entities.exception.ResourceNotFoundException("resource.not.found"));
    }

    public List<StockRequestItem> getItemsById(Long id) {
        StockRequest request = getById(id);
        return request.getItems().stream()
                .sorted(ArticleSortOrder.forStockRequestItems())
                .toList();
    }

    public Page<StockRequestListDto> getAll(String collector, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        StockRequestRepository repo = (StockRequestRepository) repository;
        String effectiveCollector = resolveCollector(collector);
        List<StockRequestStatus> statuses = resolveVisibleStatuses();

        return repo.findFilteredList(effectiveCollector, startDate, endDate, statuses, pageable);
    }

    public com.optimize.elykia.core.dto.stock.StockRequestKpiDto getKpis(String collector, LocalDate startDate, LocalDate endDate) {
        StockRequestRepository repo = (StockRequestRepository) repository;
        String effectiveCollector = resolveCollector(collector);
        List<StockRequestStatus> statuses = resolveVisibleStatuses();

        List<Object[]> counts = repo.countByStatusFiltered(effectiveCollector, startDate, endDate, statuses);

        long pending = 0;
        long validated = 0;
        long delivered = 0;
        long cancelledRefused = 0;

        for (Object[] row : counts) {
            StockRequestStatus status = (StockRequestStatus) row[0];
            long count = (Long) row[1];
            switch (status) {
                case CREATED -> pending = count;
                case VALIDATED -> validated = count;
                case DELIVERED -> delivered = count;
                case CANCELLED, REFUSED -> cancelledRefused += count;
                default -> { }
            }
        }

        return com.optimize.elykia.core.dto.stock.StockRequestKpiDto.builder()
                .total(pending + validated + delivered + cancelledRefused)
                .pending(pending)
                .validated(validated)
                .delivered(delivered)
                .build();
    }

    private String resolveCollector(String collector) {
        if (Objects.nonNull(collector)) {
            return collector;
        }
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER)) {
            return user.getUsername();
        }
        return null;
    }

    private List<StockRequestStatus> resolveVisibleStatuses() {
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.MAGASINIER)) {
            return List.of(StockRequestStatus.VALIDATED, StockRequestStatus.DELIVERED);
        }
        return List.of(
                StockRequestStatus.CREATED,
                StockRequestStatus.VALIDATED,
                StockRequestStatus.DELIVERED,
                StockRequestStatus.CANCELLED,
                StockRequestStatus.REFUSED);
    }

    /** @deprecated use {@link #getAll(String, LocalDate, LocalDate, Pageable)} */
    public Page<StockRequestListDto> getAll(String collector, Pageable pageable) {
        return getAll(collector, null, null, pageable);
    }

    @Autowired
    public void setMonthlyStockItemRepository(CommercialMonthlyStockItemRepository monthlyStockItemRepository) {
        this.monthlyStockItemRepository = monthlyStockItemRepository;
    }

    @Autowired
    public void setStockReturnRepository(StockReturnRepository stockReturnRepository) {
        this.stockReturnRepository = stockReturnRepository;
    }
}