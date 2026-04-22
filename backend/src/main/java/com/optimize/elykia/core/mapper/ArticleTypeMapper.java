package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.ArticleTypeDto;
import com.optimize.elykia.core.entity.article.ArticleType;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ArticleTypeMapper extends BaseMapper<ArticleType, ArticleTypeDto> {
}
