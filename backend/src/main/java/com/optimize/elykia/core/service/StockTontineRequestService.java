package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.Articles;
import com.optimize.elykia.core.entity.StockTontineRequest;
import com.optimize.elykia.core.entity.StockTontineRequestItem;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.event.StockTontineRequestDeliveredEvent;
import com.optimize.elykia.core.repository.StockTontineRequestRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.context.ApplicationEventPublisher;
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
import com.optimize.elykia.core.dto.StockRequestExportDTO;
import com.itextpdf.html2pdf.HtmlConverter;
import java.io.ByteArrayOutputStream;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import com.optimize.elykia.core.dto.StockExportPdfContextDto;

@Service
@Transactional
public class StockTontineRequestService extends GenericService<StockTontineRequest, Long> {

    private final UserService userService;
    private final TontineStockService tontineStockService;
    private final ApplicationEventPublisher eventPublisher;
    private final ArticlesService articlesService;
    private final StockMovementService stockMovementService;
    private final AccountingDayService accountingDayService;
    private final TemplateEngine templateEngine;

    protected StockTontineRequestService(StockTontineRequestRepository repository,
            UserService userService,
            TontineStockService tontineStockService,
            ApplicationEventPublisher eventPublisher,
            ArticlesService articlesService,
            StockMovementService stockMovementService,
            AccountingDayService accountingDayService,
            TemplateEngine templateEngine) {
        super(repository);
        this.userService = userService;
        this.tontineStockService = tontineStockService;
        this.eventPublisher = eventPublisher;
        this.articlesService = articlesService;
        this.stockMovementService = stockMovementService;
        this.accountingDayService = accountingDayService;
        this.templateEngine = templateEngine;
    }

    public StockTontineRequest save(StockTontineRequest request) {
        // Si c'est une création (ID null)
        if (request.getId() == null) {
            request.setStatus(StockRequestStatus.CREATED);
            request.setRequestDate(LocalDate.now());

            // Si le collector n'est pas défini, on prend l'utilisateur courant
            if (request.getCollector() == null) {
                request.setCollector(userService.getCurrentUser().getUsername());
            }

            // Génération de la référence (Logique identique à StockRequestService)
            String collector = request.getCollector();
            String collectorSuffix = (collector != null && collector.length() >= 3)
                    ? collector.substring(collector.length() - 3)
                    : (collector != null ? collector : "UNK");

            Long maxId = ((StockTontineRequestRepository) getRepository()).findMaxId();
            long nextId = (maxId != null ? maxId : 0) + 1;

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("ddMMyyHHmmss"));
            String reference = "T#" + collectorSuffix + nextId + timestamp; // T# pour Tontine
            request.setReference(reference);

            double totalSale = 0;
            double totalPurchase = 0;

            // Initialisation des items
            for (StockTontineRequestItem item : request.getItems()) {
                Articles article = articlesService.getById(item.getArticle().getId());
                item.setArticle(article);
                item.setItemName(article.getCommercialName() + " " + article.getName());

                // On fige les prix
                if (item.getUnitPrice() == null || item.getUnitPrice() == 0) {
                    item.setUnitPrice(article.getCreditSalePrice()); // Ou un prix spécifique tontine si existant
                }
                if (item.getPurchasePrice() == null || item.getPurchasePrice() == 0) {
                    item.setPurchasePrice(article.getPurchasePrice());
                }

                item.setStockTontineRequest(request);

                totalSale += (item.getUnitPrice() != null ? item.getUnitPrice() : 0.0) * item.getQuantity();
                totalPurchase += (item.getPurchasePrice() != null ? item.getPurchasePrice() : 0.0) * item.getQuantity();
            }

            request.setTotalSalePrice(totalSale);
            request.setTotalPurchasePrice(totalPurchase);
        }

        return super.create(request);
    }

    public StockTontineRequest validate(Long id) {
        StockTontineRequest request = getById(id);
        if (request.getStatus() != StockRequestStatus.CREATED) {
            throw new CustomValidationException("Seules les demandes au statut CREATED peuvent être validées.");
        }
        request.setStatus(StockRequestStatus.VALIDATED);
        request.setValidationDate(LocalDate.now());
        return update(request);
    }

    public StockTontineRequest deliver(Long id) {
        StockTontineRequest request = getById(id);
        if (request.getStatus() != StockRequestStatus.VALIDATED) {
            throw new CustomValidationException("Seules les demandes au statut VALIDATED peuvent être livrées.");
        }

        User currentUser = userService.getCurrentUser();
        List<String> insufficientStockItems = new ArrayList<>();

        // 1. Vérifier le stock magasin pour tous les articles
        for (StockTontineRequestItem item : request.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());
            if (article.getStockQuantity() < item.getQuantity()) {
                insufficientStockItems.add(
                        article.getCommercialName() + " " + article.getName() +
                                " (Demandé: " + item.getQuantity() + ", Dispo: " + article.getStockQuantity() + ")");
            }
        }

        if (!insufficientStockItems.isEmpty()) {
            throw new CustomValidationException(
                    "Stock magasin insuffisant pour les articles suivants : "
                            + String.join("| ", insufficientStockItems));
        }

        // 2. Procéder aux mouvements de sortie magasin
        for (StockTontineRequestItem item : request.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());

            stockMovementService.recordMovement(
                    article,
                    MovementType.RELEASE,
                    item.getQuantity(),
                    "Livraison Tontine " + request.getReference(),
                    currentUser.getUsername(),
                    null);

            article.makeRelease(item.getQuantity());
            articlesService.update(article);
        }

        request.setDeliveryDate(LocalDate.now());
        // 3. Mise à jour du stock Tontine du commercial
        tontineStockService.processStockDelivery(request);

        request.setStatus(StockRequestStatus.DELIVERED);

        request.setAccountingDate(accountingDayService.getCurrentAccountingDate());

        StockTontineRequest savedRequest = update(request);

        // Publication de l'événement pour le rapport journalier
        eventPublisher.publishEvent(new StockTontineRequestDeliveredEvent(
                this,
                savedRequest.getTotalSalePrice(),
                savedRequest.getCollector(),
                savedRequest.getReference()));

        return savedRequest;
    }

    public Page<StockTontineRequest> getAll(String collector, Pageable pageable) {
        if (Objects.nonNull(collector)) {
            return ((StockTontineRequestRepository) getRepository()).findByCollectorOrderByIdDesc(collector, pageable);
        }

        User user = userService.getCurrentUser();

        // Si c'est un commercial (Promoter), il ne voit que ses demandes
        if (user.is(UserProfilConstant.PROMOTER)) {
            return ((StockTontineRequestRepository) getRepository()).findByCollectorOrderByIdDesc(user.getUsername(),
                    pageable);
        }

        // Si c'est un magasinier, il voit les demandes Validées ou Livrées (pour
        // préparer la livraison)
        // Note: Dans StockRequestService, le magasinier voit VALIDATED et DELIVERED.
        // Mais il doit aussi pouvoir voir les CREATED s'il a le droit de valider ?
        // Dans l'existant:
        // findByStatusInOrderByIdDesc(List.of(StockRequestStatus.VALIDATED,
        // StockRequestStatus.DELIVERED)
        // Je copie la logique existante.
        if (user.is(UserProfilConstant.MAGASINIER)) {
            return ((StockTontineRequestRepository) getRepository()).findByStatusInOrderByIdDesc(
                    List.of(StockRequestStatus.VALIDATED, StockRequestStatus.DELIVERED), pageable);
        }

        // Gestionnaire/Admin voit CREATED et DELIVERED (et VALIDATED implicitement ?)
        // L'existant dit: List.of(StockRequestStatus.CREATED,
        // StockRequestStatus.DELIVERED)
        // C'est un peu étrange qu'il ne voit pas VALIDATED, mais je respecte
        // l'existant.
        // Correction: Si je suis gestionnaire, je dois voir CREATED pour pouvoir
        // valider.
        return ((StockTontineRequestRepository) getRepository()).findByStatusInOrderByIdDesc(
                List.of(StockRequestStatus.CREATED, StockRequestStatus.VALIDATED, StockRequestStatus.DELIVERED),
                pageable);
    }

    public byte[] generatePdfExport(LocalDate startDate, LocalDate endDate, String collector) {
        List<StockRequestStatus> statuses = List.of(StockRequestStatus.DELIVERED);

        // Security check: if promoter, force collector to be current user
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER)) {
            collector = user.getUsername();
        }

        List<StockRequestExportDTO> data = ((StockTontineRequestRepository) getRepository())
                .findAggregatedStockRequests(startDate, endDate, collector, statuses);

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title("Rapport des Sorties de Stock Tontine")
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
