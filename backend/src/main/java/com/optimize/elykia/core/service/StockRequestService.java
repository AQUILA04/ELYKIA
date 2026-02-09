package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.*;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.StockRequestRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
import com.optimize.elykia.core.dto.StockRequestExportDTO;
import com.itextpdf.html2pdf.HtmlConverter;
import java.io.ByteArrayOutputStream;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import com.optimize.elykia.core.dto.StockExportPdfContextDto;

@Service
@Transactional
public class StockRequestService extends GenericService<StockRequest, Long> {

    private final ArticlesService articlesService;
    private final CommercialMonthlyStockRepository monthlyStockRepository;
    private final UserService userService;
    private final AccountingDayService accountingDayService;
    private final StockMovementService stockMovementService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final TemplateEngine templateEngine;

    public StockRequestService(StockRequestRepository repository,
            ArticlesService articlesService,
            CommercialMonthlyStockRepository monthlyStockRepository,
            UserService userService,
            AccountingDayService accountingDayService,
            StockMovementService stockMovementService,
            org.springframework.context.ApplicationEventPublisher eventPublisher,
            TemplateEngine templateEngine) {
        super(repository);
        this.articlesService = articlesService;
        this.monthlyStockRepository = monthlyStockRepository;
        this.userService = userService;
        this.accountingDayService = accountingDayService;
        this.stockMovementService = stockMovementService;
        this.eventPublisher = eventPublisher;
        this.templateEngine = templateEngine;
    }

    public StockRequest createRequest(StockRequest request) {
        request.setStatus(StockRequestStatus.CREATED);
        request.setRequestDate(LocalDate.now());

        // Générer référence
        String collector = request.getCollector();
        String collectorSuffix = (collector != null && collector.length() >= 3)
                ? collector.substring(collector.length() - 3)
                : (collector != null ? collector : "UNK");

        Long maxId = ((StockRequestRepository) repository).findMaxId();
        long nextId = (maxId != null ? maxId : 0) + 1;

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("ddMMyyHHmmss"));

        String reference = "#" + collectorSuffix + nextId + timestamp;
        request.setReference(reference);

        double totalCreditSalePrice = 0.0;
        double totalPurchasePrice = 0.0;

        // Initialiser les prix des articles au moment de la création
        for (StockRequestItem item : request.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());
            item.setArticle(article); // S'assurer que l'article est bien chargé
            item.setItemName(article.getCommercialName() + " " + article.getName());
            item.setUnitPrice(article.getCreditSalePrice());
            item.setPurchasePrice(article.getPurchasePrice());
            item.setStockRequest(request); // Lier l'item à la requête

            totalCreditSalePrice += (item.getUnitPrice() != null ? item.getUnitPrice() : 0.0) * item.getQuantity();
            totalPurchasePrice += (item.getPurchasePrice() != null ? item.getPurchasePrice() : 0.0)
                    * item.getQuantity();
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

    public StockRequest deliverRequest(Long requestId) {
        StockRequest request = getById(requestId);
        if (request.getStatus() != StockRequestStatus.VALIDATED) {
            throw new CustomValidationException("La demande doit être validée avant livraison.");
        }

        User currentUser = userService.getCurrentUser();
        List<String> insufficientStockItems = new ArrayList<>();

        // 1. Vérifier le stock magasin pour tous les articles
        for (StockRequestItem item : request.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());
            if (article.getStockQuantity() < item.getQuantity()) {
                insufficientStockItems.add(
                        article.getCommercialName() + " " + article.getName() + " : " + article.getCreditSalePrice()
                                + " (Demandé: " + item.getQuantity() + ", Dispo: " + article.getStockQuantity() + ")");
            }
        }

        if (!insufficientStockItems.isEmpty()) {
            throw new CustomValidationException(
                    "Stock insuffisant pour les articles suivants : " + String.join("| ", insufficientStockItems));
        }

        // Si tout est OK, procéder aux mouvements
        for (StockRequestItem item : request.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());

            stockMovementService.recordMovement(
                    article,
                    MovementType.RELEASE,
                    item.getQuantity(),
                    "Livraison demande " + request.getReference(),
                    currentUser.getUsername(),
                    null);

            article.makeRelease(item.getQuantity());
            articlesService.update(article);

            // S'assurer que les prix sont bien fixés (au cas où ils n'auraient pas été mis
            // à la création ou auraient changé)
            // Note: Idéalement, on garde ceux de la création, mais si null, on prend les
            // actuels
            if (item.getUnitPrice() == null || item.getUnitPrice() == 0) {
                item.setUnitPrice(article.getCreditSalePrice());
            }
            if (item.getPurchasePrice() == null || item.getPurchasePrice() == 0) {
                item.setPurchasePrice(article.getPurchasePrice());
            }
        }

        // 2. Mettre à jour le stock mensuel du commercial
        updateCommercialMonthlyStock(request);

        request.setStatus(StockRequestStatus.DELIVERED);
        request.setDeliveryDate(LocalDate.now());
        request.setAccountingDate(accountingDayService.getCurrentAccountingDate());
        StockRequest savedRequest = repository.save(request);

        // Calculate margin
        Double margin = (savedRequest.getTotalCreditSalePrice() != null ? savedRequest.getTotalCreditSalePrice() : 0.0)
                -
                (savedRequest.getTotalPurchasePrice() != null ? savedRequest.getTotalPurchasePrice() : 0.0);

        // Publish Event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.StockRequestDeliveredEvent(
                    this,
                    savedRequest.getTotalCreditSalePrice(),
                    savedRequest.getCollector(), margin));
        }

        return savedRequest;
    }

    private void updateCommercialMonthlyStock(StockRequest request) {
        LocalDate date = LocalDate.now();
        int month = date.getMonthValue();
        int year = date.getYear();

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

            if (existingItem.isPresent()) {
                CommercialMonthlyStockItem item = existingItem.get();

                // Calcul du nouveau prix moyen pondéré
                double currentTotalValue = item.getQuantityTaken() * item.getWeightedAverageUnitPrice();
                double newRequestValue = reqItem.getQuantity() * reqItem.getUnitPrice();
                int newTotalQuantity = item.getQuantityTaken() + reqItem.getQuantity();

                if (newTotalQuantity > 0) {
                    item.setWeightedAverageUnitPrice((currentTotalValue + newRequestValue) / newTotalQuantity);
                }

                // Idem pour le prix d'achat
                double currentTotalPurchaseValue = item.getQuantityTaken() * item.getWeightedAveragePurchasePrice();
                double newRequestPurchaseValue = reqItem.getQuantity() * reqItem.getPurchasePrice();

                if (newTotalQuantity > 0) {
                    item.setWeightedAveragePurchasePrice(
                            (currentTotalPurchaseValue + newRequestPurchaseValue) / newTotalQuantity);
                }

                item.setQuantityTaken(newTotalQuantity);
                item.updateRemaining();
            } else {
                CommercialMonthlyStockItem newItem = new CommercialMonthlyStockItem();
                newItem.setArticle(reqItem.getArticle());
                newItem.setQuantityTaken(reqItem.getQuantity());
                newItem.setWeightedAverageUnitPrice(reqItem.getUnitPrice());
                newItem.setWeightedAveragePurchasePrice(reqItem.getPurchasePrice());
                newItem.updateRemaining();
                monthlyStock.addItem(newItem);
            }
        }
        monthlyStockRepository.save(monthlyStock);
    }

    public Page<StockRequest> getAll(String collector, Pageable pageable) {

        if (Objects.nonNull(collector)) {
            return ((StockRequestRepository) repository).findByCollectorOrderByIdDesc(collector, pageable);
        }

        User user = userService.getCurrentUser();

        if (user.is(UserProfilConstant.PROMOTER)) {
            return ((StockRequestRepository) repository).findByCollectorOrderByIdDesc(user.getUsername(), pageable);
        }

        if (user.is(UserProfilConstant.MAGASINIER)) {
            return ((StockRequestRepository) repository).findByStatusInOrderByIdDesc(
                    List.of(StockRequestStatus.VALIDATED, StockRequestStatus.DELIVERED), pageable);
        }

        return ((StockRequestRepository) repository).findByStatusInOrderByIdDesc(
                List.of(StockRequestStatus.CREATED, StockRequestStatus.DELIVERED), pageable);
    }

    public byte[] generatePdfExport(LocalDate startDate, LocalDate endDate, String collector) {
        List<StockRequestStatus> statuses = List.of(StockRequestStatus.DELIVERED);

        // Security check: if promoter, force collector to be current user
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER)) {
            collector = user.getUsername();
        }

        List<StockRequestExportDTO> data = ((StockRequestRepository) repository).findAggregatedStockRequests(startDate,
                endDate, collector, statuses);

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title("Rapport des Sorties de Stock")
                .startDate(startDate != null ? startDate.toString() : "Début")
                .endDate(endDate != null ? endDate.toString() : "Fin")
                .collector(collector != null ? collector : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .items(data)
                .totalQuantity(totalQuantity)
                .build();

        Context context = new Context();
        context.setVariable("context", contextDto);

        String html = templateEngine.process("stock-export", context);

        ByteArrayOutputStream target = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }
}
