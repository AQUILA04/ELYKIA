package com.optimize.elykia.sale.api;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;

/**
 * SPI port decoupling {@code sale} controllers from PDF report/stock export generators.
 */
public interface SalePdfExportPort {

    InputStream printItemReleaseSheetPdf(String username, LocalDate date) throws Exception;

    String generateItemReleasePdfForCurrentDate() throws Exception;

    InputStream generateRestockNeededPdf() throws Exception;

    byte[] generateCommercialStockDashboardPdf(String collector, Integer year, Integer month);

    byte[] generateStockRequestSortiePdf(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds);

    byte[] generateStockReturnPdf(LocalDate startDate, LocalDate endDate, String collector, List<Long> requestIds);
}
