package com.optimize.elykia.core.service.report;

import com.optimize.elykia.inventory.api.InventoryControlPdfPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.InputStream;

/**
 * Adaptateur SPI liant le module {@code inventory} au rendu PDF des fiches de contrôle d'inventaire.
 */
@Component
@RequiredArgsConstructor
public class InventoryControlPdfPortAdapter implements InventoryControlPdfPort {

    private final PdfService pdfService;

    @Override
    public InputStream generateInventoryControlPdf(Long inventoryId) throws Exception {
        return pdfService.generateInventoryControlPdf(inventoryId);
    }
}
