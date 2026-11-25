package com.optimize.elykia.inventory.application;

import com.optimize.elykia.inventory.api.WarehouseCommercialStockPort;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.inventory.domain.WarehouseStockPosition;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticlesRepository;
import com.optimize.elykia.inventory.web.dto.SupplierRestockOrderDto;
import com.optimize.elykia.organization.domain.Agency;
import com.optimize.elykia.organization.infrastructure.persistence.AgencyRepository;
import com.optimize.elykia.shared.pdf.PdfDocumentIdentity;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Calcule le Bon de Commande Fournisseur (JSON + Export PDF Navy Elykia) directement à partir des
 * Demandes de Sortie Commerciales Unifiées ({@code CommercialStockRequest}, activités {@code CREDIT} et {@code TONTINE})
 * non couvertes par le stock magasin de l'agence.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SupplierRestockOrderService {

    private static final String DOCUMENT_TITLE = "Bon de Commande Fournisseur";

    private final WarehouseStockService warehouseStockService;
    private final ArticlesRepository articlesRepository;
    private final AgencyRepository agencyRepository;
    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    private WarehouseCommercialStockPort commercialStockPort;

    @Autowired(required = false)
    public void setCommercialStockPort(WarehouseCommercialStockPort commercialStockPort) {
        this.commercialStockPort = commercialStockPort;
    }

    public SupplierRestockOrderDto computeRestockOrder(Long agencyId, String activityType) {
        Long effectiveAgencyId = warehouseStockService.resolveAgencyId(agencyId);
        String agencyName = agencyRepository.findById(effectiveAgencyId)
                .map(Agency::getName)
                .orElse("Agence #" + effectiveAgencyId);

        String normalizedActivity = (activityType == null || activityType.isBlank() || "ALL".equalsIgnoreCase(activityType))
                ? null
                : activityType.trim().toUpperCase(Locale.ROOT);

        List<WarehouseCommercialStockPort.PendingCommercialRequestLine> pendingLines =
                commercialStockPort != null
                        ? commercialStockPort.findPendingRequestLines(effectiveAgencyId, normalizedActivity)
                        : List.of();

        Map<Long, ArticleDemandAggregation> byArticle = new LinkedHashMap<>();
        for (WarehouseCommercialStockPort.PendingCommercialRequestLine line : pendingLines) {
            int remainingNeeded = Math.max(0, line.quantityRequested() - line.quantityDelivered());
            if (remainingNeeded <= 0) {
                continue;
            }
            ArticleDemandAggregation agg = byArticle.computeIfAbsent(
                    line.articleId(), id -> new ArticleDemandAggregation());
            if ("TONTINE".equalsIgnoreCase(line.activityType())) {
                agg.tontineRequestedQty += remainingNeeded;
            } else {
                agg.creditRequestedQty += remainingNeeded;
            }
            agg.totalRequestedQty += remainingNeeded;
            agg.alreadyReservedQty += Math.max(0, line.quantityReserved());
            if (line.requestReference() != null && !line.requestReference().isBlank()) {
                agg.references.add(line.requestReference());
            }
            if (line.commercialUsername() != null && !line.commercialUsername().isBlank()) {
                agg.commercials.add(line.commercialUsername());
            }
        }

        List<SupplierRestockOrderDto.SupplierRestockLineDto> resultLines = new ArrayList<>();
        int totalUnitsRequested = 0;
        int totalUnitsToOrder = 0;
        double totalEstimatedCost = 0.0;
        int idx = 1;

        for (Map.Entry<Long, ArticleDemandAggregation> entry : byArticle.entrySet()) {
            Long articleId = entry.getKey();
            ArticleDemandAggregation agg = entry.getValue();
            Articles article = articlesRepository.findById(articleId).orElse(null);
            if (article == null) {
                continue;
            }

            WarehouseStockPosition pos = warehouseStockService.getOrBuildPositionView(effectiveAgencyId, article);
            int onHand = pos.getOnHandQuantity() != null ? pos.getOnHandQuantity() : 0;
            int available = pos.availableQuantity();

            // Stock magasin mobilisable pour ces demandes = parts déjà réservées pour elles + stock encore libre disponible
            int mobilizableForRequests = agg.alreadyReservedQty + available;
            int quantityToOrder = Math.max(0, agg.totalRequestedQty - mobilizableForRequests);
            if (quantityToOrder <= 0) {
                continue;
            }

            double unitPurchase = article.getPurchasePrice() > 0 ? article.getPurchasePrice() : 0.0;
            double lineCost = quantityToOrder * unitPurchase;

            resultLines.add(new SupplierRestockOrderDto.SupplierRestockLineDto(
                    idx++,
                    article.getId(),
                    article.getCode(),
                    (article.getCommercialName() + " " + article.getName()).trim(),
                    agg.creditRequestedQty,
                    agg.tontineRequestedQty,
                    agg.totalRequestedQty,
                    onHand,
                    agg.alreadyReservedQty,
                    available,
                    quantityToOrder,
                    unitPurchase,
                    lineCost,
                    List.copyOf(agg.references),
                    List.copyOf(agg.commercials)));

            totalUnitsRequested += agg.totalRequestedQty;
            totalUnitsToOrder += quantityToOrder;
            totalEstimatedCost += lineCost;
        }

        String activityLabel = normalizedActivity == null ? "TOUTES (CRÉDIT + TONTINE)" : normalizedActivity;
        String genDate = LocalDateTime.now(ZoneOffset.UTC)
                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

        return new SupplierRestockOrderDto(
                effectiveAgencyId,
                agencyName,
                activityLabel,
                genDate,
                resultLines.size(),
                totalUnitsRequested,
                totalUnitsToOrder,
                totalEstimatedCost,
                resultLines);
    }

    public byte[] generateRestockOrderPdf(Long agencyId, String activityType) {
        SupplierRestockOrderDto dto = computeRestockOrder(agencyId, activityType);
        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, DOCUMENT_TITLE);
        context.setVariable("doc", dto);
        String html = templateEngine.process("supplier-purchase-order-sheet", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(DOCUMENT_TITLE));
    }

    private static final class ArticleDemandAggregation {
        int creditRequestedQty = 0;
        int tontineRequestedQty = 0;
        int totalRequestedQty = 0;
        int alreadyReservedQty = 0;
        final Set<String> references = new LinkedHashSet<>();
        final Set<String> commercials = new LinkedHashSet<>();
    }
}
