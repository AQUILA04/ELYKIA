package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.service.report.UnitPriceVisibility;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.service.report.PdfDocumentIdentity;
import com.optimize.elykia.core.dto.stock.StockRecoverySummaryDto;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import com.optimize.elykia.core.dto.CommercialStockDashboardExportDTO;
import com.optimize.elykia.core.dto.StockDashboardExportPdfContextDto;
import com.optimize.elykia.core.dto.StockExportPdfContextDto;
import com.optimize.elykia.core.dto.StockRequestExportDTO;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.StockRequest;
import com.optimize.elykia.core.entity.stock.StockReturn;
import com.optimize.elykia.core.entity.stock.StockTontineRequest;
import com.optimize.elykia.core.entity.stock.StockTontineReturn;
import com.optimize.elykia.core.enumaration.OperationType;
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

    private static final String DASHBOARD_DOCUMENT_TITLE = "Stock commercial mensuel";

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
        long totalDebtQuantity = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityDebt).sum();
        double totalDebtValue = finalData.stream().mapToDouble(CommercialStockDashboardExportDTO::getDebtValue).sum();
        int itemsWithRemaining = (int) finalData.stream().filter(dto -> dto.getQuantityRemaining() > 0).count();
        StockRecoverySummaryDto recovery = stock.getRecoverySummary();

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
                .periodLabel(monthLabel(month) + " " + year)
                .periodRange(startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " → "
                        + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .totalDebtQuantity(totalDebtQuantity)
                .totalDebtValue(totalDebtValue)
                .dueValue(recovery != null ? recovery.getTotalDueAmount() : totalSoldValue + totalDebtValue + totalRemainingValue)
                .recoveredValue(recovery != null ? recovery.getTotalRecoveredAmount() : 0.0)
                .leftToRecover(recovery != null ? recovery.getTotalRemainingAmount() : 0.0)
                .recoveryRate(recovery != null ? recovery.getRecoveryRatePercent() : 0.0)
                .soldRate(totalTaken > 0 ? Math.min(100.0, totalSold * 100.0 / totalTaken) : 0.0)
                .debtSettled(recovery != null ? recovery.getDebtSettledAmount() : 0.0)
                .debtRemaining(recovery != null ? recovery.getDebtRemainingAmount() : 0.0)
                .itemsWithRemaining(itemsWithRemaining)
                .build();

        return renderPdf("commercial-stock-dashboard-export", "context", contextDto, PdfHtmlRenderer.FooterStyle.MODERN);
    }

    private static final String[] MONTHS = {"Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet",
            "Août", "Septembre", "Octobre", "Novembre", "Décembre"};

    static String monthLabel(int month) {
        return month >= 1 && month <= 12 ? MONTHS[month - 1] : String.valueOf(month);
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
        CommercialStockDashboardExportDTO dto = new CommercialStockDashboardExportDTO(
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
        dto.setQuantityDebt(item.getQuantityDebt() != null ? item.getQuantityDebt().longValue() : 0L);
        dto.setDebtValue(item.debtValue());
        return dto;
    }

    public byte[] generateStockRequestSortiePdfExport(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds) {
        collector = resolveCollector(collector);
        boolean selectionMode = requestIds != null && !requestIds.isEmpty();
        List<StockRequestStatus> statuses = selectionMode
                ? List.of(StockRequestStatus.CREATED, StockRequestStatus.VALIDATED, StockRequestStatus.DELIVERED,
                        StockRequestStatus.CANCELLED, StockRequestStatus.REFUSED)
                : List.of(StockRequestStatus.DELIVERED);

        List<StockRequest> selectedRequests = selectionMode ? stockRequestRepository.findAllById(requestIds) : List.of();
        String references = selectionMode ? resolveStockRequestReferences(selectedRequests) : null;
        String resolvedCollector = selectionMode
                ? resolveSelectionCollector(selectedRequests.stream().map(StockRequest::getCollector).toList(), collector)
                : (collector != null && !collector.isBlank() ? collector : "Tous");

        List<StockRequestExportDTO> data = stockRequestRepository.findAggregatedStockRequests(
                startDate, endDate, collector, statuses, requestIds);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title(selectionMode ? "Fiche de demande(s) de sortie stock" : "Fiche des demandes de sortie stock")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(resolvedCollector)
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

        List<StockReturn> selectedReturns = selectionMode ? stockReturnRepository.findAllById(requestIds) : List.of();
        String references = selectionMode ? resolveStockReturnReferences(selectedReturns) : null;
        String resolvedCollector = selectionMode
                ? resolveSelectionCollector(selectedReturns.stream().map(StockReturn::getCollector).toList(), collector)
                : (collector != null && !collector.isBlank() ? collector : "Tous");

        List<StockRequestExportDTO> data = stockReturnRepository.findAggregatedStockReturns(
                startDate, endDate, collector, statuses, requestIds);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title(selectionMode ? "Fiche de retour(s) stock" : "Fiche des retours stock")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(resolvedCollector)
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

        List<StockTontineRequest> selectedRequests = selectionMode ? stockTontineRequestRepository.findAllById(requestIds) : List.of();
        String references = selectionMode ? resolveStockTontineRequestReferences(selectedRequests) : null;
        String resolvedCollector = selectionMode
                ? resolveSelectionCollector(selectedRequests.stream().map(StockTontineRequest::getCollector).toList(), collector)
                : (collector != null && !collector.isBlank() ? collector : "Tous");

        List<StockRequestExportDTO> data = stockTontineRequestRepository.findAggregatedStockRequests(
                startDate, endDate, collector, statuses, requestIds);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title(selectionMode ? "Fiche de demande(s) de sortie stock tontine" : "Fiche des demandes de sortie stock tontine")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(resolvedCollector)
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .references(references)
                .selectionMode(selectionMode)
                .items(data)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();

        return renderPdf("stock-request-sortie-export", "context", contextDto, OperationType.CASH);
    }

    public byte[] generateStockTontineReturnPdfExport(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds) {
        collector = resolveCollector(collector);
        boolean selectionMode = requestIds != null && !requestIds.isEmpty();
        List<StockReturnStatus> statuses = selectionMode
                ? List.of(StockReturnStatus.CREATED, StockReturnStatus.RECEIVED,
                        StockReturnStatus.CANCELLED, StockReturnStatus.REFUSED)
                : List.of(StockReturnStatus.RECEIVED);

        List<StockTontineReturn> selectedReturns = selectionMode ? stockTontineReturnRepository.findAllById(requestIds) : List.of();
        String references = selectionMode ? resolveStockTontineReturnReferences(selectedReturns) : null;
        String resolvedCollector = selectionMode
                ? resolveSelectionCollector(selectedReturns.stream().map(StockTontineReturn::getCollector).toList(), collector)
                : (collector != null && !collector.isBlank() ? collector : "Tous");

        List<StockRequestExportDTO> data = stockTontineReturnRepository.findAggregatedStockReturns(
                startDate, endDate, collector, statuses, requestIds);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title(selectionMode ? "Fiche de retour(s) stock tontine" : "Fiche des retours stock tontine")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(resolvedCollector)
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .references(references)
                .selectionMode(selectionMode)
                .items(data)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();

        return renderPdf("stock-return-export", "context", contextDto, OperationType.CASH);
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

    private String resolveStockRequestReferences(List<StockRequest> requests) {
        return requests.stream()
                .map(r -> r.getReference() != null && !r.getReference().isBlank()
                        ? r.getReference()
                        : "#" + r.getId())
                .sorted()
                .reduce((a, b) -> a + ", " + b)
                .orElse("—");
    }

    private String resolveStockReturnReferences(List<StockReturn> returns) {
        return returns.stream()
                .map(r -> r.getReference() != null && !r.getReference().isBlank()
                        ? r.getReference()
                        : "Retour #" + r.getId())
                .sorted()
                .reduce((a, b) -> a + ", " + b)
                .orElse("—");
    }

    private String resolveStockTontineRequestReferences(List<StockTontineRequest> requests) {
        return requests.stream()
                .map(r -> r.getReference() != null && !r.getReference().isBlank()
                        ? r.getReference()
                        : "#" + r.getId())
                .sorted()
                .reduce((a, b) -> a + ", " + b)
                .orElse("—");
    }

    private String resolveStockTontineReturnReferences(List<StockTontineReturn> returns) {
        return returns.stream()
                .map(r -> "Retour #" + r.getId())
                .sorted()
                .reduce((a, b) -> a + ", " + b)
                .orElse("—");
    }

    private String resolveSelectionCollector(List<String> entityCollectors, String fallbackCollector) {
        List<String> distinctCollectors = entityCollectors.stream()
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted()
                .toList();
        if (!distinctCollectors.isEmpty()) {
            return String.join(", ", distinctCollectors);
        }
        return (fallbackCollector != null && !fallbackCollector.isBlank()) ? fallbackCollector : "Tous";
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.toString() : "—";
    }

    private byte[] renderPdf(String template, String variableName, Object contextDto) {
        return renderPdf(template, variableName, contextDto, PdfHtmlRenderer.FooterStyle.CLASSIC, null);
    }

    private byte[] renderPdf(String template, String variableName, Object contextDto, OperationType saleType) {
        return renderPdf(template, variableName, contextDto, PdfHtmlRenderer.FooterStyle.CLASSIC, saleType);
    }

    private byte[] renderPdf(String template, String variableName, Object contextDto,
            PdfHtmlRenderer.FooterStyle footerStyle) {
        return renderPdf(template, variableName, contextDto, footerStyle, null);
    }

    private byte[] renderPdf(String template, String variableName, Object contextDto,
            PdfHtmlRenderer.FooterStyle footerStyle, OperationType saleType) {
        String title = extractTitle(contextDto);
        Context context = new Context();
        UnitPriceVisibility.apply(context, saleType);
        PdfDocumentIdentity.applyTo(context, title);
        context.setVariable(variableName, contextDto);
        String html = templateEngine.process(template, context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(title), footerStyle);
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
