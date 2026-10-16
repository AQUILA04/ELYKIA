package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.entity.article.Articles;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ArticlesMapper extends BaseMapper<Articles, ArticlesDto> {

    @Override
    @Mapping(target = "photoObjectKey", ignore = true)
    @Mapping(target = "photoUrl", ignore = true)
    @Mapping(target = "displayPhotoUrl", ignore = true)
    Articles toEntity(ArticlesDto dto);
}
