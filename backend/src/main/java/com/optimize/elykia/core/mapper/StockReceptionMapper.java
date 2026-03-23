package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.StockReceptionDto;
import com.optimize.elykia.core.dto.StockReceptionItemDto;
import com.optimize.elykia.core.entity.stock.StockReception;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface StockReceptionMapper extends BaseMapper<StockReception, StockReceptionDto> {

    @Override
    @Named("toDto")
    @Mapping(target = "items", ignore = true) // Par défaut, on ignore les items pour la liste
    StockReceptionDto toDto(StockReception entity);

    @Named("toDtoWithItems")
    @Mapping(target = "items", source = "items") // Pour le détail, on inclut les items
    StockReceptionDto toDtoWithItems(StockReception entity);

    @Mapping(target = "articleId", source = "article.id")
    @Mapping(target = "articleName", source = "article.name")
    StockReceptionItemDto toItemDto(StockReceptionItem item);
}
