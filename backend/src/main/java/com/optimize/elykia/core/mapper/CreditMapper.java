package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.CreditArticlesDto;
import com.optimize.elykia.core.dto.CreditDto;
import com.optimize.elykia.core.dto.CreditTimelineDto;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.CreditArticles;
import com.optimize.elykia.core.entity.CreditTimeline;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CreditMapper extends BaseMapper<Credit, CreditDto> {

    @Mapping(source = "creditId", target = "credit.id")
    CreditTimeline toCreditTimeline(CreditTimelineDto creditTimelineDto);

    @Mapping(source = "creditId", target = "credit.id")
    @Mapping(source = "articleId", target = "articles.id")
    @Mapping(source = "stockItemId", target = "stockItemId")
    CreditArticles toCreditArticles(CreditArticlesDto creditArticlesDto);

    @Override
    @Mapping(source = "clientId", target = "client.id")
    Credit toEntity(CreditDto dto);
}
