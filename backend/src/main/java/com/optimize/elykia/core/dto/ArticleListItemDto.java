package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.service.store.ArticlePhotoView;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

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
        State state,
        String photoUrl,
        String displayPhotoUrl) {

    public static ArticleListItemDto fromEntity(Articles article) {
        return fromEntity(article, null);
    }

    public static ArticleListItemDto fromEntity(Articles article, ArticlePhotoView photo) {
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
                articleState,
                photo != null ? photo.photoUrl() : null,
                photo != null ? photo.displayPhotoUrl() : null);
    }

    public static List<ArticleListItemDto> fromList(List<Articles> articles) {
        return fromList(articles, Map.of());
    }

    public static List<ArticleListItemDto> fromList(List<Articles> articles, Map<Long, ArticlePhotoView> photos) {
        if (articles == null) {
            return List.of();
        }
        Map<Long, ArticlePhotoView> resolved = photos != null ? photos : Map.of();
        return articles.stream()
                .map(article -> fromEntity(article, article != null ? resolved.get(article.getId()) : null))
                .toList();
    }

    public static Page<ArticleListItemDto> fromPage(Page<Articles> articles) {
        return fromPage(articles, Map.of());
    }

    public static Page<ArticleListItemDto> fromPage(Page<Articles> articles, Map<Long, ArticlePhotoView> photos) {
        if (articles == null) {
            return Page.empty();
        }
        Map<Long, ArticlePhotoView> resolved = photos != null ? photos : Map.of();
        return articles.map(article -> fromEntity(article, resolved.get(article.getId())));
    }
}
