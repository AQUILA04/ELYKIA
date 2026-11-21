package com.optimize.elykia.finance.api;

import java.io.InputStream;

/**
 * Port SPI permettant au contrôleur de caisse d'imprimer le PDF des opérations journalières
 * sans dépendre directement de {@code PdfService}.
 */
public interface CashDeskDailyOperationPdfPort {

    InputStream printDailyOperationPdf() throws Exception;
}
