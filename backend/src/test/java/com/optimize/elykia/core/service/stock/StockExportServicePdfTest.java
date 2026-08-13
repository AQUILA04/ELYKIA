package com.optimize.elykia.core.service.stock;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.repository.StockRequestRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.repository.StockTontineRequestRepository;
import com.optimize.elykia.core.repository.StockTontineReturnRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockExportServicePdfTest {

    @Mock private StockRequestRepository stockRequestRepository;
    @Mock private StockReturnRepository stockReturnRepository;
    @Mock private StockTontineRequestRepository stockTontineRequestRepository;
    @Mock private StockTontineReturnRepository stockTontineReturnRepository;
    @Mock private TontineStockRepository tontineStockRepository;
    @Mock private CommercialMonthlyStockService commercialMonthlyStockService;
    @Mock private UserService userService;
    @Mock private TemplateEngine templateEngine;

    private StockExportService service;

    @BeforeEach
    void setUp() {
        service = new StockExportService(
                stockRequestRepository,
                stockReturnRepository,
                stockTontineRequestRepository,
                stockTontineReturnRepository,
                tontineStockRepository,
                commercialMonthlyStockService,
                userService,
                templateEngine,
                new PdfHtmlRenderer());
        User user = new User();
        when(userService.getCurrentUser()).thenReturn(user);
    }

    @Test
    void stockRequestAndReturnPdfsStampPageNumbers() throws Exception {
        when(stockRequestRepository.findAggregatedStockRequests(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());
        when(stockReturnRepository.findAggregatedStockReturns(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());
        when(stockTontineRequestRepository.findAggregatedStockRequests(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());
        when(stockTontineReturnRepository.findAggregatedStockReturns(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());
        when(templateEngine.process(any(String.class), any(Context.class))).thenReturn(twoPageHtml());

        java.time.LocalDate start = java.time.LocalDate.of(2026, 8, 1);
        java.time.LocalDate end = java.time.LocalDate.of(2026, 8, 13);

        assertHasPageNumbers(service.generateStockRequestSortiePdfExport(start, end, "COM001", null));
        assertHasPageNumbers(service.generateStockReturnPdfExport(start, end, "COM001", null));
        assertHasPageNumbers(service.generateStockTontineRequestSortiePdfExport(start, end, "COM001", null));
        assertHasPageNumbers(service.generateStockTontineReturnPdfExport(start, end, "COM001", null));
    }

    @Test
    void dashboardPdfUsesMonthlyStockEntityQuantities() throws Exception {
        CommercialMonthlyStock stock = sampleMonthlyStock();
        when(commercialMonthlyStockService.findEnrichedByCollectorAndMonthAndYear("COM001", 8, 2026))
                .thenReturn(Optional.of(stock));
        when(templateEngine.process(eq("commercial-stock-dashboard-export"), any(Context.class)))
                .thenReturn(twoPageHtml());

        byte[] pdf = service.generateDashboardPdfExport("COM001", 2026, 8);

        assertHasPageNumbers(pdf);
        verify(stockRequestRepository, never()).findAggregatedStockRequests(any(), any(), any(), any(), any());
        verify(stockReturnRepository, never()).findAggregatedStockReturns(any(), any(), any(), any(), any());

        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("commercial-stock-dashboard-export"), contextCaptor.capture());
        Context ctx = contextCaptor.getValue();
        assertThat(ctx.getVariable("pdfDocumentTitle")).isEqualTo("Rapport de Stock Commercial");
        Object contextVar = ctx.getVariable("context");
        assertThat(contextVar).isNotNull();
        var dto = (com.optimize.elykia.core.dto.StockDashboardExportPdfContextDto) contextVar;
        assertThat(dto.getCollector()).isEqualTo("COM001");
        assertThat(dto.getStartDate()).isEqualTo("2026-08-01");
        assertThat(dto.getEndDate()).isEqualTo("2026-08-31");
        assertThat(dto.getItems()).hasSize(1);
        assertThat(dto.getItems().get(0).getQuantityTaken()).isEqualTo(12L);
        assertThat(dto.getItems().get(0).getQuantitySold()).isEqualTo(5L);
        assertThat(dto.getItems().get(0).getQuantityReturned()).isEqualTo(2L);
        assertThat(dto.getItems().get(0).getQuantityRemaining()).isEqualTo(5L);
        assertThat(dto.getItems().get(0).getSoldValue()).isEqualTo(25000.0);
        assertThat(dto.getItems().get(0).getArticleName()).contains("Article Test");
        assertThat(dto.getTotalTaken()).isEqualTo(12L);
        assertThat(dto.getTotalSold()).isEqualTo(5L);
    }

    private CommercialMonthlyStock sampleMonthlyStock() {
        Articles article = new Articles();
        article.setType("ELECTRO");
        article.setMarque("Marque");
        article.setModel("Modele");
        article.setName("Article Test");

        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setArticle(article);
        item.setQuantityTaken(12);
        item.setQuantitySold(5);
        item.setQuantityReturned(2);
        item.setQuantityRemaining(5);
        item.setWeightedAverageUnitPrice(5000.0);
        item.setTotalSoldValue(25000.0);

        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setCollector("COM001");
        stock.setYear(2026);
        stock.setMonth(8);
        stock.setItems(Set.of(item));
        return stock;
    }

    private String twoPageHtml() {
        return """
                <!DOCTYPE html>
                <html>
                <head><style>@page { size: A4; margin: 14mm 12mm 24mm 12mm; }</style></head>
                <body>
                  <div style="page-break-after: always;">Page A</div>
                  <div>Page B</div>
                </body>
                </html>
                """;
    }

    private void assertHasPageNumbers(byte[] pdfBytes) throws Exception {
        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertThat(pdf.getNumberOfPages()).isEqualTo(2);
            assertThat(PdfTextExtractor.getTextFromPage(pdf.getPage(1))).contains("1/2");
            assertThat(PdfTextExtractor.getTextFromPage(pdf.getPage(2))).contains("2/2");
        }
    }
}
