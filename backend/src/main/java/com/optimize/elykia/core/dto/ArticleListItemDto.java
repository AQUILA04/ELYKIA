package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.article.Articles;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * DTO de catalogue / sélecteur article — champs utiles frontend, mobile et listes,
 * sans métadonnées BI ni audit.
 */
public record ArticleListItemDto(
        Long id,
        String code,
        String name,
        String marque,
        String model,
        String type,
        String commercialName,
        Double purchasePrice,
        Double sellingPrice,
        Double creditSalePrice,
        Integer stockQuantity,
        State status,
        State state) {

    public static ArticleListItemDto fromEntity(Articles article) {
        if (article == null) {
            return null;
        }
        State articleState = article.getState();
        return new ArticleListItemDto(
                article.getId(),
                article.getCode(),
                article.getName(),
                article.getMarque(),
                article.getModel(),
                article.getType(),
                article.getCommercialName(),
                article.getPurchasePrice(),
                article.getSellingPrice(),
                article.getCreditSalePrice(),
                article.getStockQuantity(),
                articleState,
                articleState);
    }

    public static List<ArticleListItemDto> fromList(List<Articles> articles) {
        if (articles == null) {
            return List.of();
        }
        return articles.stream().map(ArticleListItemDto::fromEntity).toList();
    }

    public static Page<ArticleListItemDto> fromPage(Page<Articles> articles) {
        if (articles == null) {
            return Page.empty();
        }
        return articles.map(ArticleListItemDto::fromEntity);
    }
}
