package com.optimize.elykia.core.mapper;

import com.optimize.elykia.core.dto.CreditArticlesDto;
import com.optimize.elykia.core.dto.CreditTimelineDto;
import com.optimize.elykia.core.entity.CreditArticles;
import com.optimize.elykia.core.entity.CreditTimeline;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CreditTimelineMapper {
    @Mapping(source = "creditId", target = "credit.id")
    CreditTimeline toCreditTimeline(CreditTimelineDto creditTimelineDto);

    @Mapping(source = "creditId", target = "credit.id")
    @Mapping(source = "articleId", target = "articles.id")
    CreditArticles toCreditArticles(CreditArticlesDto creditArticlesDto);
}
