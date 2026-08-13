package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.service.report.PdfDocumentIdentity;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import com.optimize.elykia.core.dto.CommercialStockDashboardExportDTO;
import com.optimize.elykia.core.dto.StockDashboardExportPdfContextDto;
import com.optimize.elykia.core.dto.StockExportPdfContextDto;
import com.optimize.elykia.core.dto.StockRequestExportDTO;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.StockRequestRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.repository.StockTontineRequestRepository;
import com.optimize.elykia.core.repository.StockTontineReturnRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import com.optimize.elykia.core.util.ArticleSortOrder;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class StockExportService {

    private static final String DASHBOARD_DOCUMENT_TITLE = "Rapport de Stock Commercial";

    private final StockRequestRepository stockRequestRepository;
    private final StockReturnRepository stockReturnRepository;
    private final StockTontineRequestRepository stockTontineRequestRepository;
    private final StockTontineReturnRepository stockTontineReturnRepository;
    private final TontineStockRepository tontineStockRepository;
    private final CommercialMonthlyStockService commercialMonthlyStockService;
    private final UserService userService;
    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    public StockExportService(
            StockRequestRepository stockRequestRepository,
            StockReturnRepository stockReturnRepository,
            StockTontineRequestRepository stockTontineRequestRepository,
            StockTontineReturnRepository stockTontineReturnRepository,
            TontineStockRepository tontineStockRepository,
            CommercialMonthlyStockService commercialMonthlyStockService,
            UserService userService,
            TemplateEngine templateEngine,
            PdfHtmlRenderer pdfHtmlRenderer) {
        this.stockRequestRepository = stockRequestRepository;
        this.stockReturnRepository = stockReturnRepository;
        this.stockTontineRequestRepository = stockTontineRequestRepository;
        this.stockTontineReturnRepository = stockTontineReturnRepository;
        this.tontineStockRepository = tontineStockRepository;
        this.commercialMonthlyStockService = commercialMonthlyStockService;
        this.userService = userService;
        this.templateEngine = templateEngine;
        this.pdfHtmlRenderer = pdfHtmlRenderer;
    }

    public byte[] generateDashboardPdfExport(String collector, Integer year, Integer month) {
        if (year == null || month == null) {
            throw new CustomValidationException("L'année et le mois sont obligatoires pour exporter le rapport de stock.");
        }
        String resolvedCollector = resolveCollector(collector);
        if (resolvedCollector == null || resolvedCollector.isBlank()) {
            throw new CustomValidationException("Un commercial doit être sélectionné pour exporter le rapport de stock.");
        }

        CommercialMonthlyStock stock = commercialMonthlyStockService
                .findEnrichedByCollectorAndMonthAndYear(resolvedCollector, month, year)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stock mensuel introuvable pour " + resolvedCollector + " — " + month + "/" + year));

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<CommercialStockDashboardExportDTO> finalData = stock.getItems().stream()
                .map(this::toDashboardExportDto)
                .sorted(ArticleSortOrder.forDashboardExportDto())
                .toList();

        long totalTaken = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityTaken).sum();
        long totalSold = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantitySold).sum();
        long totalReturned = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityReturned).sum();
        long totalRemaining = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityRemaining).sum();
        double totalSoldValue = finalData.stream().mapToDouble(CommercialStockDashboardExportDTO::getSoldValue).sum();
        double totalRemainingValue = finalData.stream().mapToDouble(CommercialStockDashboardExportDTO::getRemainingValue).sum();

        StockDashboardExportPdfContextDto contextDto = StockDashboardExportPdfContextDto.builder()
                .title(DASHBOARD_DOCUMENT_TITLE)
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(resolvedCollector)
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .items(finalData)
                .totalTaken(totalTaken)
                .totalSold(totalSold)
                .totalReturned(totalReturned)
                .totalRemaining(totalRemaining)
                .totalSoldValue(totalSoldValue)
                .totalRemainingValue(totalRemainingValue)
                .build();

        return renderPdf("commercial-stock-dashboard-export", "context", contextDto);
    }

    private CommercialStockDashboardExportDTO toDashboardExportDto(CommercialMonthlyStockItem item) {
        Articles article = item.getArticle();
        String commercialName = article != null ? article.getCommercialName() : "";
        String name = article != null && article.getName() != null ? article.getName() : "";
        String articleName = (commercialName + " " + name).trim();
        double unitPrice = item.getWeightedAverageUnitPrice() != null ? item.getWeightedAverageUnitPrice() : 0.0;
        long taken = item.getQuantityTaken() != null ? item.getQuantityTaken().longValue() : 0L;
        long sold = item.getQuantitySold() != null ? item.getQuantitySold().longValue() : 0L;
        long returned = item.getQuantityReturned() != null ? item.getQuantityReturned().longValue() : 0L;
        double soldValue = item.getTotalSoldValue() != null ? item.getTotalSoldValue() : 0.0;
        return new CommercialStockDashboardExportDTO(
                articleName,
                unitPrice,
                taken,
                sold,
                returned,
                soldValue,
                article != null ? article.getType() : null,
                article != null ? article.getMarque() : null,
                article != null ? article.getModel() : null,
                name);
    }

    public byte[] generateStockRequestSortiePdfExport(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds) {
        collector = resolveCollector(collector);
        boolean selectionMode = requestIds != null && !requestIds.isEmpty();
        List<StockRequestStatus> statuses = selectionMode
                ? List.of(StockRequestStatus.CREATED, StockRequestStatus.VALIDATED, StockRequestStatus.DELIVERED,
                        StockRequestStatus.CANCELLED, StockRequestStatus.REFUSED)
                : List.of(StockRequestStatus.DELIVERED);

        List<StockRequestExportDTO> data = stockRequestRepository.findAggregatedStockRequests(
                startDate, endDate, collector, statuses, requestIds);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();
        String references = selectionMode ? resolveStockRequestReferences(requestIds) : null;

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title(selectionMode ? "Fiche de demande(s) de sortie stock" : "Fiche des demandes de sortie stock")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(collector != null ? collector : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .references(references)
                .selectionMode(selectionMode)
                .items(data)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();

        return renderPdf("stock-request-sortie-export", "context", contextDto);
    }

    public byte[] generateStockReturnPdfExport(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds) {
        collector = resolveCollector(collector);
        boolean selectionMode = requestIds != null && !requestIds.isEmpty();
        List<StockReturnStatus> statuses = selectionMode
                ? List.of(StockReturnStatus.CREATED, StockReturnStatus.RECEIVED,
                        StockReturnStatus.CANCELLED, StockReturnStatus.REFUSED)
                : List.of(StockReturnStatus.RECEIVED);

        List<StockRequestExportDTO> data = stockReturnRepository.findAggregatedStockReturns(
                startDate, endDate, collector, statuses, requestIds);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();
        String references = selectionMode ? resolveStockReturnReferences(requestIds) : null;

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title(selectionMode ? "Fiche de retour(s) stock" : "Fiche des retours stock")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(collector != null ? collector : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .references(references)
                .selectionMode(selectionMode)
                .items(data)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();

        return renderPdf("stock-return-export", "context", contextDto);
    }

    public byte[] generateStockTontineRequestSortiePdfExport(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds) {
        collector = resolveCollector(collector);
        boolean selectionMode = requestIds != null && !requestIds.isEmpty();
        List<StockRequestStatus> statuses = selectionMode
                ? List.of(StockRequestStatus.CREATED, StockRequestStatus.VALIDATED, StockRequestStatus.DELIVERED,
                        StockRequestStatus.CANCELLED, StockRequestStatus.REFUSED)
                : List.of(StockRequestStatus.DELIVERED);

        List<StockRequestExportDTO> data = stockTontineRequestRepository.findAggregatedStockRequests(
                startDate, endDate, collector, statuses, requestIds);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();
        String references = selectionMode ? resolveStockTontineRequestReferences(requestIds) : null;

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title(selectionMode ? "Fiche de demande(s) de sortie stock tontine" : "Fiche des demandes de sortie stock tontine")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(collector != null ? collector : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .references(references)
                .selectionMode(selectionMode)
                .items(data)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();

        return renderPdf("stock-request-sortie-export", "context", contextDto);
    }

    public byte[] generateStockTontineReturnPdfExport(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds) {
        collector = resolveCollector(collector);
        boolean selectionMode = requestIds != null && !requestIds.isEmpty();
        List<StockReturnStatus> statuses = selectionMode
                ? List.of(StockReturnStatus.CREATED, StockReturnStatus.RECEIVED,
                        StockReturnStatus.CANCELLED, StockReturnStatus.REFUSED)
                : List.of(StockReturnStatus.RECEIVED);

        List<StockRequestExportDTO> data = stockTontineReturnRepository.findAggregatedStockReturns(
                startDate, endDate, collector, statuses, requestIds);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();
        String references = selectionMode ? resolveStockTontineReturnReferences(requestIds) : null;

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title(selectionMode ? "Fiche de retour(s) stock tontine" : "Fiche des retours stock tontine")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(collector != null ? collector : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .references(references)
                .selectionMode(selectionMode)
                .items(data)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();

        return renderPdf("stock-return-export", "context", contextDto);
    }

    public byte[] generateTontineDashboardPdfExport(String commercial, Integer year) {
        commercial = resolveCollector(commercial);
        List<TontineStock> stocks = tontineStockRepository.findByCommercialAndYear(commercial, year);

        List<CommercialStockDashboardExportDTO> finalData = stocks.stream()
                .map(stock -> {
                    double unitPrice = stock.getWeightedAverageUnitPrice() != null ? stock.getWeightedAverageUnitPrice() : 0.0;
                    int taken = stock.getTotalQuantity() != null ? stock.getTotalQuantity() : 0;
                    int sold = stock.getDistributedQuantity() != null ? stock.getDistributedQuantity() : 0;
                    int returned = stock.getQuantityReturned() != null ? stock.getQuantityReturned() : 0;
                    double soldValue = sold * unitPrice;
                    return new CommercialStockDashboardExportDTO(
                            stock.getArticleName(),
                            unitPrice,
                            (long) taken,
                            (long) sold,
                            (long) returned,
                            soldValue,
                            null, null, null, stock.getArticleName());
                })
                .sorted(ArticleSortOrder.forDashboardExportDto())
                .toList();

        long totalTaken = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityTaken).sum();
        long totalSold = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantitySold).sum();
        long totalReturned = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityReturned).sum();
        long totalRemaining = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityRemaining).sum();
        double totalSoldValue = finalData.stream().mapToDouble(CommercialStockDashboardExportDTO::getSoldValue).sum();
        double totalRemainingValue = finalData.stream().mapToDouble(CommercialStockDashboardExportDTO::getRemainingValue).sum();

        LocalDate startDate = LocalDate.of(year, 1, 1);
        LocalDate endDate = LocalDate.of(year, 12, 31);

        StockDashboardExportPdfContextDto contextDto = StockDashboardExportPdfContextDto.builder()
                .title("Rapport de Stock Tontine")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(commercial != null ? commercial : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .items(finalData)
                .totalTaken(totalTaken)
                .totalSold(totalSold)
                .totalReturned(totalReturned)
                .totalRemaining(totalRemaining)
                .totalSoldValue(totalSoldValue)
                .totalRemainingValue(totalRemainingValue)
                .build();

        return renderPdf("commercial-stock-dashboard-export", "context", contextDto);
    }

    private String resolveCollector(String collector) {
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER)) {
            return user.getUsername();
        }
        return collector;
    }

    private String resolveStockRequestReferences(List<Long> requestIds) {
        return stockRequestRepository.findAllById(requestIds).stream()
                .map(r -> r.getReference() != null && !r.getReference().isBlank()
                        ? r.getReference()
                        : "#" + r.getId())
                .sorted()
                .reduce((a, b) -> a + ", " + b)
                .orElse("—");
    }

    private String resolveStockReturnReferences(List<Long> requestIds) {
        return stockReturnRepository.findAllById(requestIds).stream()
                .map(r -> r.getReference() != null && !r.getReference().isBlank()
                        ? r.getReference()
                        : "Retour #" + r.getId())
                .sorted()
                .reduce((a, b) -> a + ", " + b)
                .orElse("—");
    }

    private String resolveStockTontineRequestReferences(List<Long> requestIds) {
        return stockTontineRequestRepository.findAllById(requestIds).stream()
                .map(r -> r.getReference() != null && !r.getReference().isBlank()
                        ? r.getReference()
                        : "#" + r.getId())
                .sorted()
                .reduce((a, b) -> a + ", " + b)
                .orElse("—");
    }

    private String resolveStockTontineReturnReferences(List<Long> requestIds) {
        return stockTontineReturnRepository.findAllById(requestIds).stream()
                .map(r -> "Retour #" + r.getId())
                .sorted()
                .reduce((a, b) -> a + ", " + b)
                .orElse("—");
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.toString() : "—";
    }

    private byte[] renderPdf(String template, String variableName, Object contextDto) {
        String title = extractTitle(contextDto);
        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, title);
        context.setVariable(variableName, contextDto);
        String html = templateEngine.process(template, context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(title));
    }

    private String extractTitle(Object contextDto) {
        if (contextDto instanceof StockExportPdfContextDto dto && dto.getTitle() != null && !dto.getTitle().isBlank()) {
            return dto.getTitle();
        }
        if (contextDto instanceof StockDashboardExportPdfContextDto dto && dto.getTitle() != null && !dto.getTitle().isBlank()) {
            return dto.getTitle();
        }
        return "Document";
    }
}
