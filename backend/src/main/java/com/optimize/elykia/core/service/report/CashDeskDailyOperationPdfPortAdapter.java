package com.optimize.elykia.core.service.report;

import com.optimize.elykia.finance.api.CashDeskDailyOperationPdfPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.InputStream;

/**
 * Adaptateur SPI liant le contrôleur de caisse {@code finance} à l'impression PDF des opérations journalières.
 */
@Component
@RequiredArgsConstructor
public class CashDeskDailyOperationPdfPortAdapter implements CashDeskDailyOperationPdfPort {

    private final PdfService pdfService;

    @Override
    public InputStream printDailyOperationPdf() throws Exception {
        return pdfService.printDailyOperationPdf();
    }
}
