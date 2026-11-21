package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.PendingOrderStockPreviewDto;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.core.entity.stock.StockTontineRequest;
import com.optimize.elykia.core.entity.stock.StockTontineRequestDeliveryLink;
import com.optimize.elykia.core.entity.stock.StockTontineRequestItem;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.StockTontineRequestDeliveryLinkRepository;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.service.stock.StockTontineRequestService;
import com.optimize.elykia.shared.security.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TontineDeliveryStockRequestService {

    static final List<StockRequestStatus> ACTIVE_STATUSES = List.of(
            StockRequestStatus.CREATED,
            StockRequestStatus.VALIDATED,
            StockRequestStatus.DELIVERED);

    private final TontineDeliveryRepository deliveryRepository;
    private final TontineDeliveryWebService deliveryWebService;
    private final StockTontineRequestService stockTontineRequestService;
    private final StockTontineRequestDeliveryLinkRepository linkRepository;
    private final UserService userService;

    public PendingOrderStockPreviewDto preview(List<Long> deliveryIds) {
        List<PendingOrderStockPreviewDto.Group> groups = toPreviewGroups(loadEligible(deliveryIds, false));
        return previewOf(groups);
    }

    public List<StockTontineRequest> create(List<Long> deliveryIds) {
        return createFor(loadEligible(deliveryIds, true));
    }

    public PendingOrderStockPreviewDto previewPending(LocalDateTime dateFrom, LocalDateTime dateTo,
            String commercial, String search) {
        return previewOf(toPreviewGroups(loadEligiblePending(dateFrom, dateTo, commercial, search)));
    }

    public List<StockTontineRequest> createFromPending(LocalDateTime dateFrom, LocalDateTime dateTo,
            String commercial, String search) {
        List<TontineDelivery> deliveries = loadEligiblePending(dateFrom, dateTo, commercial, search);
        if (deliveries.isEmpty()) {
            throw new CustomValidationException(
                    "Aucune livraison en attente éligible pour une demande de stock.");
        }
        return createFor(deliveries);
    }

    private PendingOrderStockPreviewDto previewOf(List<PendingOrderStockPreviewDto.Group> groups) {
        int count = groups.stream().mapToInt(group -> group.getOrderIds().size()).sum();
        return PendingOrderStockPreviewDto.builder()
                .orderCount(count)
                .groups(groups)
                .build();
    }

    private List<StockTontineRequest> createFor(List<TontineDelivery> deliveries) {
        Map<String, List<TontineDelivery>> byCommercial = deliveries.stream()
                .collect(Collectors.groupingBy(
                        delivery -> delivery.getCommercialUsername().trim(),
                        LinkedHashMap::new,
                        Collectors.toList()));
        List<StockTontineRequest> created = new ArrayList<>();
        for (Map.Entry<String, List<TontineDelivery>> entry : byCommercial.entrySet()) {
            created.add(createForCommercial(entry.getKey(), entry.getValue()));
        }
        return created;
    }

    private List<TontineDelivery> loadEligiblePending(LocalDateTime dateFrom, LocalDateTime dateTo,
            String commercial, String search) {
        assertCanRequestStock(userService.getCurrentUser());
        List<Long> ids = deliveryWebService.findPending(dateFrom, dateTo, commercial, search).stream()
                .map(TontineDelivery::getId)
                .toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, TontineDelivery> found = new LinkedHashMap<>();
        for (TontineDelivery delivery : deliveryRepository.findAllWithItemsByIdIn(ids)) {
            found.put(delivery.getId(), delivery);
        }
        List<TontineDelivery> eligible = new ArrayList<>();
        for (TontineDelivery delivery : found.values()) {
            if (delivery.getTontineMember() == null
                    || delivery.getTontineMember().getDeliveryStatus() != TontineMemberDeliveryStatus.PENDING) {
                continue;
            }
            if (!StringUtils.hasText(delivery.getCommercialUsername())) {
                continue;
            }
            if (delivery.getItems() == null || delivery.getItems().isEmpty()) {
                continue;
            }
            if (linkRepository.existsActiveForDelivery(delivery.getId(), ACTIVE_STATUSES)) {
                continue;
            }
            eligible.add(delivery);
        }
        return eligible;
    }

    private List<TontineDelivery> loadEligible(Collection<Long> deliveryIds, boolean failOnEmptyItems) {
        if (deliveryIds == null || deliveryIds.isEmpty()) {
            throw new CustomValidationException("Au moins une livraison est requise.");
        }
        User currentUser = userService.getCurrentUser();
        assertCanRequestStock(currentUser);
        List<Long> distinctIds = deliveryIds.stream().distinct().toList();
        Map<Long, TontineDelivery> found = new LinkedHashMap<>();
        for (TontineDelivery delivery : deliveryRepository.findAllWithItemsByIdIn(distinctIds)) {
            found.put(delivery.getId(), delivery);
        }
        List<TontineDelivery> eligible = new ArrayList<>();
        for (Long deliveryId : distinctIds) {
            TontineDelivery delivery = found.get(deliveryId);
            if (delivery == null) {
                throw new CustomValidationException("Livraison introuvable : " + deliveryId);
            }
            validateEligible(delivery);
            if (delivery.getItems() == null || delivery.getItems().isEmpty()) {
                if (failOnEmptyItems) {
                    throw new CustomValidationException(
                            "La livraison " + label(delivery) + " n'a aucun article.");
                }
                continue;
            }
            eligible.add(delivery);
        }
        return eligible;
    }

    private StockTontineRequest createForCommercial(String commercial, List<TontineDelivery> deliveries) {
        Map<Long, AggregatedItem> aggregated = new LinkedHashMap<>();
        for (TontineDelivery delivery : deliveries) {
            for (TontineDeliveryItem item : delivery.getItems()) {
                Articles article = item.getArticles();
                if (article == null || article.getId() == null) {
                    continue;
                }
                int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
                if (quantity <= 0) {
                    continue;
                }
                AggregatedItem agg = aggregated.computeIfAbsent(article.getId(), id -> new AggregatedItem(article));
                agg.quantity += quantity;
            }
        }
        if (aggregated.isEmpty()) {
            throw new CustomValidationException(
                    "Aucune ligne d'article à inclure dans la demande de stock pour " + commercial + ".");
        }

        String note = "Livraisons " + deliveries.stream()
                .map(this::label)
                .collect(Collectors.joining(", "));

        StockTontineRequest request = new StockTontineRequest();
        request.setCollector(commercial);
        request.setNote(note.length() > 255 ? note.substring(0, 252) + "..." : note);
        for (AggregatedItem agg : aggregated.values()) {
            StockTontineRequestItem item = new StockTontineRequestItem();
            item.setArticle(agg.article);
            item.setQuantity(agg.quantity);
            request.addItem(item);
        }

        StockTontineRequest saved = stockTontineRequestService.save(request);
        for (TontineDelivery delivery : deliveries) {
            StockTontineRequestDeliveryLink link = new StockTontineRequestDeliveryLink();
            link.setStockTontineRequest(saved);
            link.setDelivery(delivery);
            linkRepository.save(link);
        }
        return saved;
    }

    private List<PendingOrderStockPreviewDto.Group> toPreviewGroups(List<TontineDelivery> deliveries) {
        Map<String, List<TontineDelivery>> byCommercial = deliveries.stream()
                .filter(delivery -> StringUtils.hasText(delivery.getCommercialUsername()))
                .collect(Collectors.groupingBy(
                        delivery -> delivery.getCommercialUsername().trim(),
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<PendingOrderStockPreviewDto.Group> groups = new ArrayList<>();
        for (Map.Entry<String, List<TontineDelivery>> entry : byCommercial.entrySet()) {
            Map<String, Integer> quantities = new LinkedHashMap<>();
            List<Long> deliveryIds = new ArrayList<>();
            for (TontineDelivery delivery : entry.getValue()) {
                deliveryIds.add(delivery.getId());
                if (delivery.getItems() == null) {
                    continue;
                }
                for (TontineDeliveryItem item : delivery.getItems()) {
                    int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
                    if (quantity <= 0) {
                        continue;
                    }
                    quantities.merge(articleLabel(item), quantity, Integer::sum);
                }
            }
            deliveryIds.sort(Comparator.naturalOrder());
            List<PendingOrderStockPreviewDto.ArticleLine> articles = quantities.entrySet().stream()
                    .map(article -> PendingOrderStockPreviewDto.ArticleLine.builder()
                            .name(article.getKey())
                            .quantity(article.getValue())
                            .build())
                    .toList();
            groups.add(PendingOrderStockPreviewDto.Group.builder()
                    .collector(entry.getKey())
                    .orderIds(deliveryIds)
                    .articles(articles)
                    .build());
        }
        groups.sort(Comparator.comparing(
                PendingOrderStockPreviewDto.Group::getCollector, String.CASE_INSENSITIVE_ORDER));
        return groups;
    }

    private void validateEligible(TontineDelivery delivery) {
        TontineMemberDeliveryStatus status = delivery.getTontineMember().getDeliveryStatus();
        if (status != TontineMemberDeliveryStatus.PENDING && status != TontineMemberDeliveryStatus.VALIDATED) {
            throw new CustomValidationException(
                    "Seules les livraisons en attente ou validées peuvent générer une demande de stock ("
                            + label(delivery) + ").");
        }
        if (!StringUtils.hasText(delivery.getCommercialUsername())) {
            throw new CustomValidationException(
                    "La livraison " + label(delivery) + " n'a pas de commercial associé.");
        }
        if (linkRepository.existsActiveForDelivery(delivery.getId(), ACTIVE_STATUSES)) {
            throw new CustomValidationException(
                    "La livraison " + label(delivery) + " est déjà liée à une demande de stock active.");
        }
    }

    private void assertCanRequestStock(User user) {
        boolean allowed = user != null && user.getPermissions() != null && user.getPermissions().stream()
                .anyMatch(permission -> UserPermissionConstant.ORDER_STOCK_REQUEST.equals(permission.getName()));
        if (!allowed) {
            throw new CustomValidationException(
                    "Vous n'êtes pas autorisé à créer une demande de stock depuis une commande.");
        }
    }

    private String label(TontineDelivery delivery) {
        return StringUtils.hasText(delivery.getReference())
                ? delivery.getReference().trim()
                : "LIV-" + delivery.getId();
    }

    private String articleLabel(TontineDeliveryItem item) {
        Articles article = item.getArticles();
        if (article != null && StringUtils.hasText(article.getCommercialName())) {
            return article.getCommercialName().trim();
        }
        if (article != null && StringUtils.hasText(article.getName())) {
            return article.getName().trim();
        }
        if (StringUtils.hasText(item.getArticleName())) {
            return item.getArticleName().trim();
        }
        return "Article";
    }

    private static final class AggregatedItem {
        private final Articles article;
        private int quantity;

        private AggregatedItem(Articles article) {
            this.article = article;
        }
    }
}
