package com.optimize.elykia.core.service.stock;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.stock.StockRecoverySummaryDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.repository.StockRequestRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.repository.StockTontineRequestRepository;
import com.optimize.elykia.core.repository.StockTontineReturnRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import com.optimize.elykia.core.service.report.UnitPriceVisibility;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/** Rendu réel du PDF « Stock commercial mensuel » : templates Thymeleaf + iText, texte extrait. */
@ExtendWith(MockitoExtension.class)
class StockDashboardPdfRenderingTest {

    @Mock private StockRequestRepository stockRequestRepository;
    @Mock private StockReturnRepository stockReturnRepository;
    @Mock private StockTontineRequestRepository stockTontineRequestRepository;
    @Mock private StockTontineReturnRepository stockTontineReturnRepository;
    @Mock private TontineStockRepository tontineStockRepository;
    @Mock private CommercialMonthlyStockService monthlyStockService;
    @Mock private UserService userService;

    @Test
    void stockPdfShowsBothFlowsAndSubtractsTheDebtFromTheRemaining() throws Exception {
        // Instance statique laissee par un test Spring precedent : on force la regle par defaut (prix visibles).
        ReflectionTestUtils.setField(UnitPriceVisibility.class, "instance", null);
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        StockExportService service = new StockExportService(stockRequestRepository, stockReturnRepository,
                stockTontineRequestRepository, stockTontineReturnRepository, tontineStockRepository,
                monthlyStockService, userService, engine, new PdfHtmlRenderer());
        when(userService.getCurrentUser()).thenReturn(new User());

        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setId(5L);
        stock.setCollector("COM006");
        stock.setMonth(10);
        stock.setYear(2026);
        Articles savon = new Articles();
        savon.setName("NANABEL SIMPLE");
        savon.setType("SAVON");
        savon.setMarque("NANABEL");
        savon.setModel("SIMPLE");
        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setArticle(savon);
        item.setQuantityTaken(10);
        item.setQuantitySold(6);
        item.setQuantityReturned(1);
        item.setQuantityDebt(2);
        item.setDebtUnitPrice(2_200D);
        item.setQuantityRemaining(1);
        item.setWeightedAverageUnitPrice(2_200D);
        item.setTotalSoldValue(13_200D);
        stock.setItems(Set.of(item));
        stock.setRecoverySummary(StockRecoverySummaryDto.builder()
                .totalDueAmount(19_800D)
                .totalRecoveredAmount(8_000D)
                .totalRemainingAmount(11_800D)
                .recoveryRatePercent(41D)
                .debtSettledAmount(2_000D)
                .debtRemainingAmount(2_400D)
                .build());
        when(monthlyStockService.findEnrichedByCollectorAndMonthAndYear("COM006", 10, 2026))
                .thenReturn(Optional.of(stock));

        byte[] pdf = service.generateDashboardPdfExport("COM006", 2026, 10);
        Path dir = Path.of("target", "pdf-preview");
        Files.createDirectories(dir);
        Files.write(dir.resolve("stock-commercial.pdf"), pdf);

        String text;
        try (PdfDocument doc = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            text = PdfTextExtractor.getTextFromPage(doc.getPage(1));
        }
        assertTrue(text.contains("Stock commercial mensuel"), text);
        assertTrue(text.contains("Octobre 2026"));
        assertTrue(text.contains("01/10/2026"), "période lisible");
        assertTrue(text.contains("MARCHANDISE"));
        assertTrue(text.contains("ARGENT"));
        assertTrue(text.contains("11 800 FCFA"), "reste à recouvrer");
        assertTrue(text.contains("NANABEL SIMPLE"));
        assertTrue(text.contains("Page 1/1"));
    }
}
