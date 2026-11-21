package com.optimize.elykia.inventory.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.inventory.web.dto.ArticlesDto;
import com.optimize.elykia.inventory.domain.Articles;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ArticlesMapper extends BaseMapper<Articles, ArticlesDto> {

    @Override
    @Mapping(target = "photoObjectKey", ignore = true)
    @Mapping(target = "photoUrl", ignore = true)
    @Mapping(target = "displayPhotoUrl", ignore = true)
    @Mapping(target = "salePacks", ignore = true)
    Articles toEntity(ArticlesDto dto);
}
