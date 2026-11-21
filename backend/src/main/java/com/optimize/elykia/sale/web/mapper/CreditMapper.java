package com.optimize.elykia.sale.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.sale.web.dto.CreditArticlesDto;
import com.optimize.elykia.sale.web.dto.CreditDto;
import com.optimize.elykia.sale.web.dto.CreditTimelineDto;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditTimeline;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CreditMapper extends BaseMapper<Credit, CreditDto> {

    @Mapping(source = "creditId", target = "credit.id")
    CreditTimeline toCreditTimeline(CreditTimelineDto creditTimelineDto);

    @Mapping(source = "creditId", target = "credit.id")
    @Mapping(source = "articleId", target = "articles.id")
    @Mapping(source = "stockItemId", target = "stockItemId")
    @Mapping(source = "tontineItemId", target = "tontineItemId")
    @Mapping(source = "salePackMode", target = "requestedSalePackMode")
    @Mapping(source = "packCount", target = "requestedPackCount")
    @Mapping(source = "unitsPerPack", target = "requestedUnitsPerPack")
    @Mapping(target = "saleLine", ignore = true)
    CreditArticles toCreditArticles(CreditArticlesDto creditArticlesDto);

    @Override
    @Mapping(source = "clientId", target = "client.id")
    Credit toEntity(CreditDto dto);
}
