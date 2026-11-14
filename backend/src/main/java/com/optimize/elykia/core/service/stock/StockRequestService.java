package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.ArticleHistoryContext;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.StockRequest;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockHistoryReferenceType;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.StockRequestRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.store.InventoryWarehouseGuard;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.util.UserPermissionConstant;
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
import com.optimize.elykia.core.event.StockRequestValidatedEvent;

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
    private StockRequestOrderLinkService stockRequestOrderLinkService;
    private InventoryWarehouseGuard inventoryWarehouseGuard;
    private com.optimize.elykia.core.service.sale.CreditService creditService;

    @Autowired
    public void setCreditService(
            @org.springframework.context.annotation.Lazy com.optimize.elykia.core.service.sale.CreditService creditService) {
        this.creditService = creditService;
    }

    @Autowired
    public void setInventoryWarehouseGuard(InventoryWarehouseGuard inventoryWarehouseGuard) {
        this.inventoryWarehouseGuard = inventoryWarehouseGuard;
    }

    private void assertWarehouseStockMutable() {
        if (inventoryWarehouseGuard != null) {
            inventoryWarehouseGuard.assertWarehouseStockMutable();
        }
    }

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
    public void setStockRequestOrderLinkService(StockRequestOrderLinkService stockRequestOrderLinkService) {
        this.stockRequestOrderLinkService = stockRequestOrderLinkService;
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

        Long maxId = ((StockRequestRepository) repository).findMaxId();
        long nextId = (maxId != null ? maxId : 0) + 1;

        request.setReference(nextReference(nextId));

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

    /**
     * Sortie déjà validée pour une vente comptant. Les prix sont ceux de la vente, pas le tarif crédit.
     */
    public StockRequest createValidatedCashSaleRequest(com.optimize.elykia.core.entity.sale.Credit credit) {
        StockRequest request = new StockRequest();
        request.setCollector(credit.getCollector());
        request.setNote("Vente comptant " + credit.getReference());
        request.setCredit(credit);
        request.setCashSaleReference(credit.getReference());
        request.setStatus(StockRequestStatus.VALIDATED);
        request.setRequestDate(LocalDate.now());
        request.setValidationDate(LocalDate.now());
        request.setMonth(LocalDate.now().getMonthValue());
        request.setYear(LocalDate.now().getYear());
        Long maxId = ((StockRequestRepository) repository).findMaxId();
        long nextId = (maxId != null ? maxId : 0) + 1;
        request.setReference(nextReference(nextId));

        double totalSale = 0.0;
        double totalPurchase = 0.0;
        if (credit.getArticles() != null) {
            for (com.optimize.elykia.core.entity.sale.CreditArticles line : credit.getArticles()) {
                Articles article = line.getArticles() != null
                        ? line.getArticles()
                        : articlesService.getById(line.getArticlesId());
                StockRequestItem item = new StockRequestItem();
                int quantity = line.getQuantity() == null ? 0 : line.getQuantity();
                double unitPrice = line.getUnitPrice() == null ? 0.0 : line.getUnitPrice();
                item.setArticle(article);
                item.setQuantity(quantity);
                item.setItemName(article.getCommercialName() + " " + article.getName());
                item.setUnitPrice(unitPrice);
                item.setPurchasePrice(article.getPurchasePrice());
                request.addItem(item);
                totalSale += unitPrice * quantity;
                totalPurchase += article.getPurchasePrice() * quantity;
            }
        }
        request.setTotalCreditSalePrice(totalSale);
        request.setTotalPurchasePrice(totalPurchase);
        return repository.save(request);
    }

    public void cancelLinkedCashSaleRequest(Long creditId) {
        StockRequest request = ((StockRequestRepository) repository).findByCredit_Id(creditId).orElse(null);
        if (request == null) {
            return;
        }
        if (request.getStatus() == StockRequestStatus.DELIVERED) {
            throw new CustomValidationException("Cette vente comptant est déjà livrée.");
        }
        if (request.getStatus() == StockRequestStatus.CANCELLED) {
            return;
        }
        request.setStatus(StockRequestStatus.CANCELLED);
        repository.save(request);
    }

    private String nextReference(long nextId) {
        LocalDate nowRef = LocalDate.now();
        return "REQ-" + String.format("%04d", nowRef.getYear())
                + "-" + String.format("%02d", nowRef.getMonthValue())
                + "-" + String.format("%08X", nextId);
    }

    public StockRequest updateRequest(Long requestId, StockRequest updateDto) {
        StockRequest request = getById(requestId);
        if (request.getCredit() != null) {
            throw new CustomValidationException(
                    "Cette demande est liée à une vente comptant. Annulez la vente pour la défaire.");
        }
        
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
        StockRequest saved = repository.save(request);
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new StockRequestValidatedEvent(this, saved.getId()));
        }
        return saved;
    }

    /**
     * Demande de sortie commerciale créée, validée et livrée pour réalignement de prix.
     * À appeler sous SecurityContext du gestionnaire (acting user).
     */
    public StockRequest createValidateAndDeliverForPriceRealignment(
            String collector, Articles article, int quantity, String note) {
        assertWarehouseStockMutable();
        if (quantity <= 0) {
            throw new CustomValidationException("Quantité de sortie invalide pour le réalignement de prix.");
        }
        StockRequest request = new StockRequest();
        request.setCollector(collector);
        request.setNote(note);
        StockRequestItem item = new StockRequestItem();
        item.setArticle(article);
        item.setQuantity(quantity);
        request.addItem(item);

        StockRequest created = createRequest(request, false);
        validateRequest(created.getId());
        deliverRequest(created.getId());
        return getById(created.getId());
    }

    public PartialDeliveryResponseDTO deliverRequest(Long requestId) {
        assertWarehouseStockMutable();
        boolean fifoEnabled = stockValuationFacade.lockAndIsFifoEnabled();

        StockRequest request = getByIdForDelivery(requestId);
        if (request.getStatus() != StockRequestStatus.VALIDATED) {
            throw new CustomValidationException("La demande doit être validée avant livraison.");
        }

        User currentUser = userService.getCurrentUser();
        if (request.getCredit() != null) {
            return deliverCashSaleRequest(request, currentUser);
        }
        
        List<StockRequestItem> deliverableItems = new ArrayList<>();
        List<StockRequestItem> pendingRequestItems = new ArrayList<>();
        List<PartialDeliveryResponseDTO.DeliveredItemDTO> deliveredItemDTOs = new ArrayList<>();
        List<PartialDeliveryResponseDTO.PendingItemDTO> pendingItemDTOs = new ArrayList<>();

        // 1. Classification
        for (StockRequestItem item : new ArrayList<>(request.getItems())) {
            Articles article = articlesService.getById(item.getArticle().getId());
            if (article.availableQuantity() >= item.getQuantity()) {
                deliverableItems.add(item);
                deliveredItemDTOs.add(new PartialDeliveryResponseDTO.DeliveredItemDTO(item.getItemName(), item.getQuantity(), item.getUnitPrice()));
            } else if (article.availableQuantity() > 0) {
                // partial quantity available
                int availableQty = article.availableQuantity();
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
                    consumption.getAverageUnitCost(),
                    ArticleHistoryContext.withReference(
                            request.getCollector(),
                            StockHistoryReferenceType.STOCK_REQUEST,
                            request.getId(),
                            request.getReference()));

            article.makeRelease(item.getQuantity());
            articlesService.update(article);

            StockRequestDeliveryPricing.applyAtDelivery(
                    item,
                    article,
                    fifoEnabled,
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
            if (stockRequestOrderLinkService != null) {
                stockRequestOrderLinkService.copyLinksToRequest(savedRequest.getId(), savedPending);
            }
            response.setPendingRequestId(savedPending.getId());
            response.setPendingRequestReference(savedPending.getReference());
        }

        return response;
    }

    private PartialDeliveryResponseDTO deliverCashSaleRequest(StockRequest request, User currentUser) {
        String saleRef = request.getCredit() != null ? request.getCredit().getReference() : request.getReference();
        request.setCashSaleReference(saleRef);
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new CustomValidationException("Cette vente comptant n'a aucun article à livrer.");
        }
        java.util.Map<Long, Articles> locked = new java.util.LinkedHashMap<>();
        for (StockRequestItem item : request.getItems()) {
            Articles article = articlesService.lockById(item.getArticle().getId());
            locked.put(article.getId(), article);
            int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            int physical = article.getStockQuantity() == null ? 0 : article.getStockQuantity();
            if (physical < quantity) {
                throw new CustomValidationException(
                        "Le stock magasin ne couvre pas toute la vente comptant. Aucune marchandise n'a été sortie.");
            }
        }

        List<PartialDeliveryResponseDTO.DeliveredItemDTO> deliveredItemDTOs = new ArrayList<>();
        for (StockRequestItem item : request.getItems()) {
            Articles article = locked.get(item.getArticle().getId());
            int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            FifoConsumptionResult consumption = stockValuationFacade.consume(
                    article,
                    quantity,
                    ArticleStockLotMovementType.WAREHOUSE_RELEASE,
                    "STOCK_REQUEST",
                    request.getId());
            stockMovementService.recordMovement(
                    article,
                    MovementType.RELEASE,
                    quantity,
                    "Livraison vente comptant " + request.getCashSaleReference(),
                    currentUser.getUsername(),
                    request.getCredit(),
                    consumption.getAverageUnitCost(),
                    ArticleHistoryContext.withReference(
                            request.getCollector(),
                            StockHistoryReferenceType.STOCK_REQUEST,
                            request.getId(),
                            request.getReference()));
            article.makeRelease(quantity);
            article.releaseReservation(quantity);
            articlesService.update(article);
            deliveredItemDTOs.add(new PartialDeliveryResponseDTO.DeliveredItemDTO(
                    item.getItemName(), quantity, item.getUnitPrice()));
        }

        LocalDate deliveryDate = LocalDate.now();
        request.setDeliveryDate(deliveryDate);
        request.setMonth(deliveryDate.getMonthValue());
        request.setYear(deliveryDate.getYear());
        request.setAccountingDate(deliveryDate);
        request.setStatus(StockRequestStatus.DELIVERED);
        StockRequest savedRequest = repository.save(request);

        creditService.settleCashSaleOnDelivery(request.getCredit().getId());

        if (metricsPublisher != null) {
            metricsPublisher.stockRequestDelivered(request.getCollector(), false);
        }

        PartialDeliveryResponseDTO response = new PartialDeliveryResponseDTO();
        response.setDeliveryType(PartialDeliveryResponseDTO.DeliveryType.FULL);
        response.setDeliveredRequestId(savedRequest.getId());
        response.setDeliveredRequestReference(savedRequest.getReference());
        response.setDeliveredItems(deliveredItemDTOs);
        response.setPendingItems(new ArrayList<>());
        return response;
    }

    public void cancelRequest(Long requestId) {
        StockRequest request = getById(requestId);
        StockRequestStatus status = request.getStatus();
        if (status == StockRequestStatus.DELIVERED) {
            throw new CustomValidationException("Une demande déjà livrée ne peut pas être annulée.");
        }
        if (status != StockRequestStatus.CREATED && status != StockRequestStatus.VALIDATED) {
            throw new CustomValidationException("Cette demande ne peut pas être annulée.");
        }

        User currentUser = userService.getCurrentUser();
        if (status == StockRequestStatus.VALIDATED) {
            if (!hasPermission(currentUser, UserPermissionConstant.CANCEL_VALIDATED_STOCK_REQUEST)) {
                throw new CustomValidationException("Vous n'avez pas le droit d'annuler cette demande.");
            }
        } else {
            boolean isCreator = request.getCollector().equals(currentUser.getUsername());
            boolean isManager = currentUser.is(UserProfilConstant.GESTIONNAIRE) || currentUser.is(UserProfilConstant.ADMIN);
            if (!isCreator && !isManager) {
                throw new CustomValidationException("Vous n'avez pas le droit d'annuler cette demande.");
            }
        }

        if (request.getCredit() != null) {
            creditService.cancelPendingCashSale(request.getCredit().getId());
            return;
        }

        request.setStatus(StockRequestStatus.CANCELLED);
        repository.save(request);
    }

    private static boolean hasPermission(User user, String permission) {
        if (user == null || user.getPermissions() == null) {
            return false;
        }
        return user.getPermissions().stream().map(UserPermission::getName).anyMatch(permission::equals);
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
        StockRequest request = ((StockRequestRepository) repository).findByIdWithItems(id)
                .orElseThrow(() -> new com.optimize.common.entities.exception.ResourceNotFoundException("resource.not.found"));
        if (stockRequestOrderLinkService != null) {
            request.setLinkedOrderReferences(stockRequestOrderLinkService.resolveLinkedOrderReferences(id));
        }
        if (request.getCredit() != null) {
            request.setCashSaleReference(request.getCredit().getReference());
        }
        return request;
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

        Page<StockRequestListDto> page = repo.findFilteredList(effectiveCollector, startDate, endDate, statuses, pageable);
        if (!page.isEmpty()) {
            attachCashSaleReferences(page.getContent());
        }
        if (stockRequestOrderLinkService != null && !page.isEmpty()) {
            List<Long> ids = page.getContent().stream().map(StockRequestListDto::getId).toList();
            Map<Long, List<String>> refs = stockRequestOrderLinkService.resolveLinkedOrderReferences(ids);
            page.getContent().forEach(dto ->
                    dto.setLinkedOrderReferences(refs.getOrDefault(dto.getId(), List.of())));
        }
        return page;
    }

    private void attachCashSaleReferences(List<StockRequestListDto> rows) {
        List<Long> ids = rows.stream().map(StockRequestListDto::getId).toList();
        List<Object[]> pairs = ((StockRequestRepository) repository).findCashSaleReferences(ids);
        java.util.Map<Long, String> byId = new java.util.HashMap<>();
        for (Object[] pair : pairs) {
            byId.put((Long) pair[0], (String) pair[1]);
        }
        rows.forEach(dto -> dto.setCashSaleReference(byId.get(dto.getId())));
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