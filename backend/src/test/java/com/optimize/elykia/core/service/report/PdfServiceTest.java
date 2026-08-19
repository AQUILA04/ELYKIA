package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.InventoryControlPdfDto;
import com.optimize.elykia.core.dto.ItemReleaseSheetDto;
import com.optimize.elykia.core.dto.PrintOperationDto;
import com.optimize.elykia.core.dto.StockReceptionDto;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.service.order.OrderService;
import com.optimize.elykia.core.service.sale.CreditService;
import com.optimize.elykia.core.service.stock.StockReceptionService;
import com.optimize.elykia.core.service.store.InventoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PdfServiceTest {

    @Mock
    private TemplateEngine templateEngine;
    @Mock
    private CreditService creditService;
    @Mock
    private UserService userService;
    @Mock
    private ReportService reportService;
    @Mock
    private AccountingDayService accountingDayService;
    @Mock
    private OrderService orderService;
    @Mock
    private InventoryService inventoryService;
    @Mock
    private StockReceptionService stockReceptionService;
    @Mock
    private PrintOperationDto printOperation;
    @Mock
    private ItemReleaseSheetDto itemReleaseSheet;
    @Mock
    private StockReceptionDto stockReception;

    @Test
    void generateRestockNeededPdf_rejectsExportWhenNoArticleRequiresRestocking() {
        // Given
        PdfService service = service();
        when(orderService.getRestockNeededReportData()).thenReturn(List.of());

        // When
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                service::generateRestockNeededPdf);

        // Then
        assertTrue(exception.getMessage().contains("Aucun article"));
        verify(templateEngine, never()).process(eq("restock-needed-report"), org.mockito.ArgumentMatchers.any(Context.class));
    }

    @Test
    void generateHtmlFromTemplate_rejectsDailyOperationWithoutElements() {
        // Given
        PdfService service = service();
        when(printOperation.getTotalElements()).thenReturn(0);

        // When
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> service.generateHtmlFromTemplate(printOperation));

        // Then
        assertTrue(exception.getMessage().contains("Aucune donnée"));
        verify(templateEngine, never()).process(eq("daily-operation-print"), org.mockito.ArgumentMatchers.any(Context.class));
    }

    @Test
    void generateHtmlFromTemplate_passesTheCompleteOperationContractToThymeleaf() {
        // Given
        PdfService service = service();
        when(printOperation.getTotalElements()).thenReturn(2);
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        when(templateEngine.process(eq("daily-operation-print"), contextCaptor.capture())).thenReturn("<html>daily</html>");

        // When
        String html = service.generateHtmlFromTemplate(printOperation);

        // Then
        assertEquals("<html>daily</html>", html);
        assertEquals(printOperation, contextCaptor.getValue().getVariable("operation"));
    }

    @Test
    void generateItemReleaseHtmlFromTemplate_rejectsMissingOrEmptyArticleList() {
        // Given
        PdfService service = service();
        when(itemReleaseSheet.getArticles()).thenReturn(List.of());

        // When
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> service.generateItemReleaseHtmlFromTemplate(itemReleaseSheet));

        // Then
        assertTrue(exception.getMessage().contains("Aucune donnée"));
        verify(templateEngine, never()).process(eq("item-release-sheet"), org.mockito.ArgumentMatchers.any(Context.class));
    }

    @Test
    void generateStockReceptionHtmlFromTemplate_includesReceptionAndMandatoryDocumentMetadata() {
        // Given
        PdfService service = service();
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        when(templateEngine.process(eq("stock-reception-sheet"), contextCaptor.capture())).thenReturn("<html>reception</html>");

        // When
        String html = service.generateStockReceptionHtmlFromTemplate(stockReception);

        // Then
        assertEquals("<html>reception</html>", html);
        Context context = contextCaptor.getValue();
        assertEquals(stockReception, context.getVariable("reception"));
        assertEquals("AMENOUVEVE - YAVEH", context.getVariable("companyName"));
        assertTrue(context.getVariable("generationDate").toString().matches("\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}"));
    }

    @Test
    void generateInventoryControlHtmlFromTemplate_rejectsEmptyInventoryAndPassesPopulatedInventory() {
        // Given
        PdfService service = service();
        InventoryControlPdfDto emptyInventory = new InventoryControlPdfDto();
        emptyInventory.setItems(List.of());
        InventoryControlPdfDto populatedInventory = new InventoryControlPdfDto();
        populatedInventory.setItems(List.of(new InventoryControlPdfDto.InventoryItemPdfDto()));
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        when(templateEngine.process(eq("inventory-control-sheet"), contextCaptor.capture())).thenReturn("<html>inventory</html>");

        // When
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> service.generateInventoryControlHtmlFromTemplate(emptyInventory));
        String html = service.generateInventoryControlHtmlFromTemplate(populatedInventory);

        // Then
        assertTrue(exception.getMessage().contains("Aucune donnée"));
        assertEquals("<html>inventory</html>", html);
        assertEquals(populatedInventory, contextCaptor.getValue().getVariable("inventory"));
    }

    private PdfService service() {
        return new PdfService(
                templateEngine,
                creditService,
                userService,
                reportService,
                accountingDayService,
                orderService,
                inventoryService,
                stockReceptionService);
    }
}
