package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.StockReceptionDto;
import com.optimize.elykia.core.dto.StockReceptionItemDto;
import com.optimize.elykia.core.dto.StockReceptionListDto;
import com.optimize.elykia.core.entity.stock.StockReception;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface StockReceptionMapper extends BaseMapper<StockReception, StockReceptionDto> {

    @Override
    @Named("toDto")
    @Mapping(target = "items", ignore = true)
    StockReceptionDto toDto(StockReception entity);

    @Named("toDtoWithItems")
    @Mapping(target = "items", source = "items")
    StockReceptionDto toDtoWithItems(StockReception entity);

    StockReceptionListDto toListDto(StockReception entity);

    ArticleSalePackDto toSalePack(com.optimize.elykia.core.entity.stock.ReceptionSalePack pack);

    @Mapping(target = "articleId", source = "article.id")
    @Mapping(target = "articleName", source = ".", qualifiedByName = "articleFullName")
    @Mapping(target = "catalogPurchasePrice", ignore = true)
    @Mapping(target = "catalogWholesalePurchasePrice", ignore = true)
    @Mapping(target = "catalogHalfWholesalePurchasePrice", ignore = true)
    @Mapping(target = "catalogSellingPrice", ignore = true)
    @Mapping(target = "catalogWholesaleSalePrice", ignore = true)
    @Mapping(target = "catalogHalfWholesaleSalePrice", ignore = true)
    StockReceptionItemDto toItemDto(StockReceptionItem item);

    @Named("articleFullName")
    default String articleFullName(StockReceptionItem item) {
        if (item == null || item.getArticle() == null) {
            return null;
        }
        var article = item.getArticle();
        return article.getCommercialName() + " " + article.getName();
    }
}
