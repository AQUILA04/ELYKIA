package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.CreditArticleDetailDto;
import com.optimize.elykia.core.dto.SoldArticleDto;
import com.optimize.elykia.core.dto.SoldArticleSearchDto;
import com.optimize.elykia.core.dto.SoldArticlesSearchResultDto;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import com.optimize.elykia.core.service.report.PdfDocumentIdentity;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CreditArticlesService extends GenericService<CreditArticles, Long> {

    private static final String PDF_TITLE = "Rapport des Articles Vendus";

    private final org.thymeleaf.TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    protected CreditArticlesService(
            CreditArticlesRepository repository,
            org.thymeleaf.TemplateEngine templateEngine,
            PdfHtmlRenderer pdfHtmlRenderer) {
        super(repository);
        this.templateEngine = templateEngine;
        this.pdfHtmlRenderer = pdfHtmlRenderer;
    }

    public void delete(CreditArticles creditArticles) {
        getRepository().delete(creditArticles);
    }

    @Override
    public CreditArticlesRepository getRepository() {
        return (CreditArticlesRepository) super.getRepository();
    }

    public List<Object[]> getTop10ArticlesWithHighestQuantity() {
        Pageable top10 = PageRequest.of(0, 10);
        return getRepository().findTop10ArticlesWithHighestQuantity(top10);
    }

    public List<CreditArticleDetailDto> getDetailsByStockItemId(Long stockItemId) {
        return getRepository().findDetailsByStockItemId(stockItemId);
    }

    public List<CreditArticleDetailDto> getDetailsByTontineItemId(Long tontineItemId) {
        return getRepository().findDetailsByTontineItemId(tontineItemId);
    }

    public SoldArticlesSearchResultDto searchSoldArticles(SoldArticleSearchDto dto, Pageable pageable) {
        Page<SoldArticleDto> page = getRepository().findSoldArticles(
                dto.getStartDate(), dto.getEndDate(), dto.getCommercial(), pageable);
        return new SoldArticlesSearchResultDto(
                page.getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber(),
                page.getSize(),
                soldArticlesAmount(dto));
    }

    public byte[] generatePdfExport(SoldArticleSearchDto dto) {
        if (dto.getStartDate() != null && dto.getEndDate() != null) {
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(dto.getStartDate(), dto.getEndDate());
            if (daysBetween > 31) {
                throw new IllegalArgumentException("La plage de dates ne doit pas dépasser un mois.");
            }
        }

        List<SoldArticleDto> articles = getRepository()
            .findSoldArticles(dto.getStartDate(), dto.getEndDate(), dto.getCommercial(), Pageable.unpaged())
            .getContent();

        long totalQuantity = articles.stream().mapToLong(a -> a.getTotalQuantity() != null ? a.getTotalQuantity() : 0L).sum();
        double totalAmount = articles.stream().mapToDouble(a -> a.getTotalAmount() != null ? a.getTotalAmount() : 0d).sum();

        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, PDF_TITLE);
        context.setVariable("articles", articles);
        context.setVariable("articlesEmpty", articles.isEmpty());
        context.setVariable("collectorName", dto.getCommercial() != null && !dto.getCommercial().isBlank() ? dto.getCommercial() : "Tous");
        context.setVariable("startDate", dto.getStartDate() != null ? dto.getStartDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "N/A");
        context.setVariable("endDate", dto.getEndDate() != null ? dto.getEndDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "N/A");
        context.setVariable("generationDate", java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        context.setVariable("totalQuantity", totalQuantity);
        context.setVariable("totalAmount", totalAmount);

        String html = templateEngine.process("articles-vendus-export", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(PDF_TITLE));
    }

    private double soldArticlesAmount(SoldArticleSearchDto dto) {
        Double total = getRepository().sumSoldArticlesAmount(dto.getStartDate(), dto.getEndDate(), dto.getCommercial());
        return total == null ? 0d : total;
    }
}
