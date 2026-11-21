package com.optimize.elykia.sale.web.mapper;

import com.optimize.elykia.sale.web.dto.CreditArticlesDto;
import com.optimize.elykia.sale.web.dto.CreditTimelineDto;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditTimeline;
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
