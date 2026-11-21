package com.optimize.elykia.inventory.api;

import java.io.InputStream;

/**
 * Port SPI permettant au contrôleur d'inventaire de générer la fiche PDF de contrôle
 * sans dépendre directement de {@code PdfService}.
 */
public interface InventoryControlPdfPort {

    InputStream generateInventoryControlPdf(Long inventoryId) throws Exception;
}
