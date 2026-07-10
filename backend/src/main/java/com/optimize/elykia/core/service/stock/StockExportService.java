package com.optimize.elykia.core.service.stock;

import com.itextpdf.html2pdf.HtmlConverter;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.CommercialStockDashboardExportDTO;
import com.optimize.elykia.core.dto.StockDashboardExportPdfContextDto;
import com.optimize.elykia.core.dto.StockExportPdfContextDto;
import com.optimize.elykia.core.dto.StockRequestExportDTO;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
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

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class StockExportService {

    private final StockRequestRepository stockRequestRepository;
    private final StockReturnRepository stockReturnRepository;
    private final StockTontineRequestRepository stockTontineRequestRepository;
    private final StockTontineReturnRepository stockTontineReturnRepository;
    private final TontineStockRepository tontineStockRepository;
    private final CommercialStockMovementRepository commercialStockMovementRepository;
    private final UserService userService;
    private final TemplateEngine templateEngine;

    public StockExportService(
            StockRequestRepository stockRequestRepository,
            StockReturnRepository stockReturnRepository,
            StockTontineRequestRepository stockTontineRequestRepository,
            StockTontineReturnRepository stockTontineReturnRepository,
            TontineStockRepository tontineStockRepository,
            CommercialStockMovementRepository commercialStockMovementRepository,
            UserService userService,
            TemplateEngine templateEngine) {
        this.stockRequestRepository = stockRequestRepository;
        this.stockReturnRepository = stockReturnRepository;
        this.stockTontineRequestRepository = stockTontineRequestRepository;
        this.stockTontineReturnRepository = stockTontineReturnRepository;
        this.tontineStockRepository = tontineStockRepository;
        this.commercialStockMovementRepository = commercialStockMovementRepository;
        this.userService = userService;
        this.templateEngine = templateEngine;
    }

    public byte[] generateDashboardPdfExport(LocalDate startDate, LocalDate endDate, String collector) {
        collector = resolveCollector(collector);

        List<StockRequestExportDTO> takenData = stockRequestRepository.findAggregatedStockRequests(
                startDate, endDate, collector, List.of(StockRequestStatus.DELIVERED));

        List<StockRequestExportDTO> returnedData = stockReturnRepository.findAggregatedStockReturns(
                startDate, endDate, collector, StockReturnStatus.RECEIVED);

        LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : LocalDate.MIN.atStartOfDay();
        LocalDateTime endDateTime = endDate != null ? endDate.atTime(23, 59, 59) : LocalDate.MAX.atTime(23, 59, 59);

        List<CommercialStockDashboardExportDTO> soldData = commercialStockMovementRepository.findAggregatedSalesByPeriod(
                startDateTime,
                endDateTime,
                collector,
                List.of(CommercialStockMovementType.CREDIT_SALE, CommercialStockMovementType.CASH_SALE));

        Map<String, CommercialStockDashboardExportDTO> merged = new LinkedHashMap<>();

        for (StockRequestExportDTO taken : takenData) {
            String key = articleKey(taken.getArticleName(), taken.getUnitPrice());
            CommercialStockDashboardExportDTO item = merged.computeIfAbsent(key, k -> newItem(taken));
            item.setQuantityTaken(item.getQuantityTaken() + taken.getTotalQuantity());
            if (item.getUnitPrice() == null || item.getUnitPrice() == 0.0) {
                item.setUnitPrice(taken.getUnitPrice());
            }
        }

        for (CommercialStockDashboardExportDTO sold : soldData) {
            String key = articleKey(sold.getArticleName(), sold.getUnitPrice());
            CommercialStockDashboardExportDTO item = merged.computeIfAbsent(key, k -> sold);
            item.setQuantitySold(item.getQuantitySold() + sold.getQuantitySold());
            item.setSoldValue(item.getSoldValue() + sold.getSoldValue());
        }

        for (StockRequestExportDTO returned : returnedData) {
            String key = articleKey(returned.getArticleName(), returned.getUnitPrice());
            CommercialStockDashboardExportDTO item = merged.computeIfAbsent(key, k -> newItem(returned));
            item.setQuantityReturned(item.getQuantityReturned() + returned.getTotalQuantity());
            if (item.getUnitPrice() == null || item.getUnitPrice() == 0.0) {
                item.setUnitPrice(returned.getUnitPrice());
            }
        }

        List<CommercialStockDashboardExportDTO> finalData = new ArrayList<>(merged.values());
        finalData.sort(ArticleSortOrder.forDashboardExportDto());

        long totalTaken = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityTaken).sum();
        long totalSold = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantitySold).sum();
        long totalReturned = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityReturned).sum();
        long totalRemaining = finalData.stream().mapToLong(CommercialStockDashboardExportDTO::getQuantityRemaining).sum();
        double totalSoldValue = finalData.stream().mapToDouble(CommercialStockDashboardExportDTO::getSoldValue).sum();
        double totalRemainingValue = finalData.stream().mapToDouble(CommercialStockDashboardExportDTO::getRemainingValue).sum();

        StockDashboardExportPdfContextDto contextDto = StockDashboardExportPdfContextDto.builder()
                .title("Rapport de Stock Commercial")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(collector != null ? collector : "Tous")
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

    public byte[] generateStockRequestSortiePdfExport(LocalDate startDate, LocalDate endDate, String collector) {
        collector = resolveCollector(collector);

        List<StockRequestExportDTO> data = stockRequestRepository.findAggregatedStockRequests(
                startDate, endDate, collector, List.of(StockRequestStatus.DELIVERED));
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title("Fiche des demandes de sortie stock")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(collector != null ? collector : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .items(data)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();

        return renderPdf("stock-request-sortie-export", "context", contextDto);
    }

    public byte[] generateStockReturnPdfExport(LocalDate startDate, LocalDate endDate, String collector) {
        collector = resolveCollector(collector);

        List<StockRequestExportDTO> data = stockReturnRepository.findAggregatedStockReturns(
                startDate, endDate, collector, StockReturnStatus.RECEIVED);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title("Fiche des retours stock")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(collector != null ? collector : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .items(data)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();

        return renderPdf("stock-return-export", "context", contextDto);
    }

    public byte[] generateStockTontineRequestSortiePdfExport(LocalDate startDate, LocalDate endDate, String collector) {
        collector = resolveCollector(collector);

        List<StockRequestExportDTO> data = stockTontineRequestRepository.findAggregatedStockRequests(
                startDate, endDate, collector, List.of(StockRequestStatus.DELIVERED));
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title("Fiche des demandes de sortie stock tontine")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(collector != null ? collector : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .items(data)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();

        return renderPdf("stock-request-sortie-export", "context", contextDto);
    }

    public byte[] generateStockTontineReturnPdfExport(LocalDate startDate, LocalDate endDate, String collector) {
        collector = resolveCollector(collector);

        List<StockRequestExportDTO> data = stockTontineReturnRepository.findAggregatedStockReturns(
                startDate, endDate, collector, StockReturnStatus.RECEIVED);
        data.sort(ArticleSortOrder.forExportDto());

        long totalQuantity = data.stream().mapToLong(StockRequestExportDTO::getTotalQuantity).sum();
        double totalAmount = data.stream().mapToDouble(StockRequestExportDTO::getTotalAmount).sum();

        StockExportPdfContextDto contextDto = StockExportPdfContextDto.builder()
                .title("Fiche des retours stock tontine")
                .startDate(formatDate(startDate))
                .endDate(formatDate(endDate))
                .collector(collector != null ? collector : "Tous")
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
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

    private CommercialStockDashboardExportDTO newItem(StockRequestExportDTO source) {
        return new CommercialStockDashboardExportDTO(
                source.getArticleName(),
                source.getUnitPrice(),
                0L, 0L, 0L, 0.0,
                source.getType(),
                source.getMarque(),
                source.getModel(),
                source.getName());
    }

    private String articleKey(String articleName, Double unitPrice) {
        return articleName + "|" + (unitPrice != null ? unitPrice : 0.0);
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.toString() : "—";
    }

    private byte[] renderPdf(String template, String variableName, Object contextDto) {
        Context context = new Context();
        context.setVariable(variableName, contextDto);
        String html = templateEngine.process(template, context);
        ByteArrayOutputStream target = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }
}
