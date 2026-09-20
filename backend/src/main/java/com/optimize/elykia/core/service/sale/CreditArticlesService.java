package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.CreditArticleDetailDto;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CreditArticlesService extends GenericService<CreditArticles, Long> {

    private final org.thymeleaf.TemplateEngine templateEngine;

    protected CreditArticlesService(CreditArticlesRepository repository, org.thymeleaf.TemplateEngine templateEngine) {
        super(repository);
        this.templateEngine = templateEngine;
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

    public org.springframework.data.domain.Page<com.optimize.elykia.core.dto.SoldArticleDto> searchSoldArticles(com.optimize.elykia.core.dto.SoldArticleSearchDto dto, Pageable pageable) {
        return getRepository().findSoldArticles(dto.getStartDate(), dto.getEndDate(), dto.getCommercial(), pageable);
    }

    public byte[] generatePdfExport(com.optimize.elykia.core.dto.SoldArticleSearchDto dto) {
        if (dto.getStartDate() != null && dto.getEndDate() != null) {
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(dto.getStartDate(), dto.getEndDate());
            if (daysBetween > 31) {
                throw new IllegalArgumentException("La plage de dates ne doit pas dépasser un mois.");
            }
        }

        // Fetch all articles matching the filter without pagination
        List<com.optimize.elykia.core.dto.SoldArticleDto> articles = getRepository()
            .findSoldArticles(dto.getStartDate(), dto.getEndDate(), dto.getCommercial(), org.springframework.data.domain.Pageable.unpaged())
            .getContent();

        long totalQuantity = articles.stream().mapToLong(a -> a.getTotalQuantity() != null ? a.getTotalQuantity() : 0L).sum();

        org.thymeleaf.context.Context context = new org.thymeleaf.context.Context();
        context.setVariable("articles", articles);
        context.setVariable("articlesEmpty", articles.isEmpty());
        context.setVariable("collectorName", dto.getCommercial() != null && !dto.getCommercial().isBlank() ? dto.getCommercial() : "Tous");
        context.setVariable("startDate", dto.getStartDate() != null ? dto.getStartDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "N/A");
        context.setVariable("endDate", dto.getEndDate() != null ? dto.getEndDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "N/A");
        context.setVariable("generationDate", java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        context.setVariable("totalQuantity", totalQuantity);

        String html = templateEngine.process("articles-vendus-export", context);

        java.io.ByteArrayOutputStream target = new java.io.ByteArrayOutputStream();
        com.itextpdf.html2pdf.HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }
}
