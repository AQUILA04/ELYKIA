package com.optimize.elykia.inventory.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.inventory.web.dto.ArticleTypeDto;
import com.optimize.elykia.inventory.domain.ArticleType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ArticleTypeMapper extends BaseMapper<ArticleType, ArticleTypeDto> {

    @Override
    @Mapping(target = "photoObjectKey", ignore = true)
    @Mapping(target = "photoUrl", ignore = true)
    @Mapping(target = "displayPhotoUrl", ignore = true)
    ArticleType toEntity(ArticleTypeDto dto);
}
