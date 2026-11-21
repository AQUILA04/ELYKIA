package com.optimize.elykia.core.service.report;

import com.optimize.elykia.tontine.application.StockExportService;
import com.optimize.elykia.sale.api.SalePdfExportPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;

/**
 * Thin core adapter bridging {@code sale} controllers to {@link PdfService} and {@link StockExportService}.
 */
@Component
@RequiredArgsConstructor
public class SalePdfExportPortAdapter implements SalePdfExportPort {

    private final PdfService pdfService;
    private final StockExportService stockExportService;

    @Override
    public InputStream printItemReleaseSheetPdf(String username, LocalDate date) throws Exception {
        return pdfService.printItemReleaseSheetPdf(username, date);
    }

    @Override
    public String generateItemReleasePdfForCurrentDate() throws Exception {
        return pdfService.generateItemReleasePDfForCurrentDate();
    }

    @Override
    public InputStream generateRestockNeededPdf() throws Exception {
        return pdfService.generateRestockNeededPdf();
    }

    @Override
    public byte[] generateCommercialStockDashboardPdf(String collector, Integer year, Integer month) {
        return stockExportService.generateDashboardPdfExport(collector, year, month);
    }

    @Override
    public byte[] generateStockRequestSortiePdf(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds) {
        return stockExportService.generateStockRequestSortiePdfExport(startDate, endDate, collector, requestIds);
    }

    @Override
    public byte[] generateStockReturnPdf(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds) {
        return stockExportService.generateStockReturnPdfExport(startDate, endDate, collector, requestIds);
    }
}
