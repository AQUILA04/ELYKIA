package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.sale.SaleCancellationRun;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleCancellationPdfService {

    private final TemplateEngine templateEngine;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public record ArticleRow(String articleCode, String articleName, Integer quantity, Double unitPrice, Double totalPrice) {}
    public record ExcludedSaleRow(String reference, String clientName, String saleDate, Double totalAmount, Double paidAmount, String reason) {}
    public record CancelledSaleRow(String reference, String clientName, String saleDate, String initialStatus, Double totalAmount, String articlesSummary) {}

    public byte[] generateSaleAuditPdf(Credit credit, String cancellationReason, String adminUsername) {
        try {
            Context context = new Context();
            context.setVariable("creditReference", credit.getReference());
            context.setVariable("saleDate", credit.getBeginDate() != null ? credit.getBeginDate().format(DATE_FORMATTER) : "—");
            context.setVariable("clientFullName", credit.getClient() != null ? credit.getClient().getFullName() : "—");
            context.setVariable("clientCode", credit.getClient() != null ? credit.getClient().getCode() : "—");
            context.setVariable("commercialUsername", credit.getCollector());
            context.setVariable("operationType", credit.getType() != null ? credit.getType().name() : "CREDIT");
            context.setVariable("initialStatus", credit.getStatus() != null ? credit.getStatus().name() : "VALIDATED");
            context.setVariable("totalAmount", credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0);
            context.setVariable("advance", credit.getAdvance() != null ? credit.getAdvance() : 0.0);
            context.setVariable("adminUsername", adminUsername);
            context.setVariable("operationTimestamp", java.time.LocalDateTime.now().format(DATETIME_FORMATTER));
            context.setVariable("cancellationReason", cancellationReason);

            List<ArticleRow> articleRows = new ArrayList<>();
            if (credit.getArticles() != null) {
                for (CreditArticles ca : credit.getArticles()) {
                    String code = ca.getArticles() != null ? ca.getArticles().getCode() : "—";
                    String name = ca.getArticles() != null ? ca.getArticles().getCommercialName() : "Article #" + ca.getArticlesId();
                    Integer qty = ca.getQuantity() != null ? ca.getQuantity() : 0;
                    Double unitPrice = ca.getUnitPrice() != null ? ca.getUnitPrice() : 0.0;
                    Double total = qty * unitPrice;
                    articleRows.add(new ArticleRow(code, name, qty, unitPrice, total));
                }
            }
            context.setVariable("articles", articleRows);

            String html = templateEngine.process("sale-cancellation-item-audit", context);
            return renderPdf(html);
        } catch (Exception e) {
            log.error("Erreur lors de la génération du PDF d'audit de la vente {}: {}", credit.getReference(), e.getMessage());
            throw new RuntimeException("Erreur génération PDF vente " + credit.getReference(), e);
        }
    }

    public byte[] generateSummaryReportPdf(
            SaleCancellationRun run,
            List<CancelledSaleRow> cancelledSales,
            List<ExcludedSaleRow> excludedSales) {
        try {
            Context context = new Context();
            context.setVariable("commercialUsername", run.getCommercialUsername());
            context.setVariable("period", run.getStartDate().format(DATE_FORMATTER) + " au " + run.getEndDate().format(DATE_FORMATTER));
            context.setVariable("adminUsername", run.getTriggeredBy());
            context.setVariable("executionDate", java.time.LocalDateTime.now().format(DATETIME_FORMATTER));
            context.setVariable("cancellationReason", run.getCancellationReason());

            context.setVariable("cancelledCount", run.getCancelledSalesCount());
            context.setVariable("cancelledAmount", run.getCancelledSalesAmount());
            context.setVariable("excludedCount", run.getExcludedSalesCount());
            context.setVariable("excludedAmount", run.getExcludedSalesAmount());
            context.setVariable("pdfCount", run.getPdfFileCount());

            double excludedPaidAmount = excludedSales.stream()
                    .mapToDouble(ExcludedSaleRow::paidAmount)
                    .sum();
            context.setVariable("excludedPaidAmount", excludedPaidAmount);

            context.setVariable("cancelledSales", cancelledSales);
            context.setVariable("excludedSales", excludedSales);

            String html = templateEngine.process("sale-cancellation-summary-report", context);
            return renderPdf(html);
        } catch (Exception e) {
            log.error("Erreur lors de la génération du rapport global d'audit pour le run {}: {}", run.getId(), e.getMessage());
            throw new RuntimeException("Erreur génération rapport global d'audit", e);
        }
    }

    private byte[] renderPdf(String html) throws Exception {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(html);
            renderer.layout();
            renderer.createPDF(outputStream);
            return outputStream.toByteArray();
        }
    }
}
