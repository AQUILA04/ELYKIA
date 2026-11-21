package com.optimize.elykia.tontine.api;

import java.io.InputStream;

/**
 * SPI port decoupling {@code tontine} session export from legacy {@code PdfService.generatePdfFromHtml}.
 */
public interface TontineHtmlPdfPort {

    InputStream generatePdfFromHtml(String html, String filePrefix) throws Exception;
}
