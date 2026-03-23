package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;

import java.util.List;

public record TontineDeliveryItemRespDto(Long id, Articles articles, Long articleId,String articleName,
                                         Integer quantity,
                                         Double unitPrice,
                                         Double totalPrice
                                         ) {

    public static TontineDeliveryItemRespDto fromId(Long id) {
        return new TontineDeliveryItemRespDto(id, null, null, null, null, null, null);
    }

    public static TontineDeliveryItemRespDto fromDeliveryItem(TontineDeliveryItem deliveryItem) {
        return new TontineDeliveryItemRespDto(deliveryItem.getId(), deliveryItem.getArticles(), deliveryItem.getArticleId(),
                deliveryItem.getArticleName(), deliveryItem.getQuantity(), deliveryItem.getUnitPrice(), deliveryItem.getTotalPrice());
    }

    public static List<TontineDeliveryItemRespDto> fromDeliveryItems(List<TontineDeliveryItem> deliveryItems) {
        return deliveryItems.stream()
                .map(TontineDeliveryItemRespDto::fromDeliveryItem)
                .toList();
    }
}
