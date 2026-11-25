package com.optimize.elykia.inventory.application;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.optimize.elykia.inventory.api.WarehouseCommercialStockPort;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.inventory.domain.WarehouseStockPosition;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticlesRepository;
import com.optimize.elykia.inventory.web.dto.SupplierRestockOrderDto;
import com.optimize.elykia.organization.domain.Agency;
import com.optimize.elykia.organization.infrastructure.persistence.AgencyRepository;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SupplierRestockOrderServiceTest {

    @Mock private WarehouseStockService warehouseStockService;
    @Mock private ArticlesRepository articlesRepository;
    @Mock private AgencyRepository agencyRepository;
    @Mock private WarehouseCommercialStockPort commercialStockPort;

    private SupplierRestockOrderService service;

    @BeforeEach
    void setUp() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        org.thymeleaf.spring6.SpringTemplateEngine realTemplateEngine = new org.thymeleaf.spring6.SpringTemplateEngine();
        realTemplateEngine.setTemplateResolver(resolver);

        service = new SupplierRestockOrderService(
                warehouseStockService,
                articlesRepository,
                agencyRepository,
                realTemplateEngine,
                new PdfHtmlRenderer());
        service.setCommercialStockPort(commercialStockPort);

        when(warehouseStockService.resolveAgencyId(1L)).thenReturn(1L);
        Agency agency = new Agency();
        agency.setId(1L);
        agency.setCode("AG-LOME");
        agency.setName("Agence Lomé Centre");
        when(agencyRepository.findById(1L)).thenReturn(Optional.of(agency));
    }

    @Test
    void computeRestockOrder_aggregatesCreditAndTontineCommercialRequestsAndDeductsMobilizableStock() {
        Articles a1 = new Articles(10L);
        a1.setCode("ART-0010");
        a1.setType("Riz");
        a1.setMarque("Royal");
        a1.setModel("25kg");
        a1.setName("Parfumé");
        a1.setPurchasePrice(15000);
        when(articlesRepository.findById(10L)).thenReturn(Optional.of(a1));

        // Magasin : onHand = 6, reserved = 4 (dont 4 réservés pour la demande crédit), available = 2
        WarehouseStockPosition pos = WarehouseStockPosition.open(1L, 10L);
        pos.setOnHandQuantity(6);
        pos.setReservedQuantity(4);
        when(warehouseStockService.getOrBuildPositionView(1L, a1)).thenReturn(pos);

        // Demandes : CREDIT demande 10 (4 réservés), TONTINE demande 5 (0 réservé) -> total demandé = 15
        // Mobilisable = 4 (déjà réservés pour ces demandes) + 2 (disponible libre) = 6 -> Manquant net à commander = 9
        when(commercialStockPort.findPendingRequestLines(1L, null)).thenReturn(List.of(
                new WarehouseCommercialStockPort.PendingCommercialRequestLine(
                        1L, "REQ-2026-11-01", 1L, "COM001", "CREDIT", "VALIDATED",
                        LocalDate.of(2026, 11, 25), 10L, 10, 4, 0, 6, 21000.0, 15000.0),
                new WarehouseCommercialStockPort.PendingCommercialRequestLine(
                        2L, "TRQ-2026-11-02", 1L, "COM002", "TONTINE", "CREATED",
                        LocalDate.of(2026, 11, 25), 10L, 5, 0, 0, 5, 18000.0, 15000.0)
        ));

        SupplierRestockOrderDto dto = service.computeRestockOrder(1L, "ALL");

        assertEquals(1, dto.totalArticlesToOrder());
        assertEquals(15, dto.totalUnitsRequested());
        assertEquals(9, dto.totalUnitsToOrder());
        assertEquals(9 * 15000.0, dto.totalEstimatedCost(), 0.001);

        SupplierRestockOrderDto.SupplierRestockLineDto line = dto.lines().get(0);
        assertEquals(10, line.creditRequestedQty());
        assertEquals(5, line.tontineRequestedQty());
        assertEquals(15, line.totalRequestedQty());
        assertEquals(6, line.warehouseOnHandQty());
        assertEquals(4, line.alreadyReservedForRequestsQty());
        assertEquals(2, line.warehouseAvailableQty());
        assertEquals(9, line.quantityToOrder());
        assertTrue(line.requestReferences().containsAll(List.of("REQ-2026-11-01", "TRQ-2026-11-02")));
        assertTrue(line.requestingCommercials().containsAll(List.of("COM001", "COM002")));
    }

    @Test
    void generateRestockOrderPdf_rendersOfficialNavyElykiaPdfWithPaginationAndCompanyIdentity() throws Exception {
        Articles a1 = new Articles(10L);
        a1.setCode("ART-0010");
        a1.setType("Riz");
        a1.setMarque("Royal");
        a1.setModel("25kg");
        a1.setName("Parfumé");
        a1.setPurchasePrice(15000);
        when(articlesRepository.findById(10L)).thenReturn(Optional.of(a1));

        WarehouseStockPosition pos = WarehouseStockPosition.open(1L, 10L);
        pos.setOnHandQuantity(2);
        pos.setReservedQuantity(2);
        when(warehouseStockService.getOrBuildPositionView(1L, a1)).thenReturn(pos);

        when(commercialStockPort.findPendingRequestLines(1L, null)).thenReturn(List.of(
                new WarehouseCommercialStockPort.PendingCommercialRequestLine(
                        1L, "REQ-2026-11-01", 1L, "COM001", "CREDIT", "VALIDATED",
                        LocalDate.of(2026, 11, 25), 10L, 8, 2, 0, 6, 21000.0, 15000.0)
        ));

        byte[] pdfBytes = service.generateRestockOrderPdf(1L, "ALL");
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500);

        try (PdfDocument pdfDoc = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertEquals(1, pdfDoc.getNumberOfPages());
            String text = PdfTextExtractor.getTextFromPage(pdfDoc.getPage(1));
            assertTrue(text.contains("AMENOUVEVE-YAVEH"));
            assertTrue(text.contains("Bon de Commande Fournisseur"));
            assertTrue(text.contains("REQ-2026-11-01"));
            assertTrue(text.contains("1/1"));
        }
    }
}
