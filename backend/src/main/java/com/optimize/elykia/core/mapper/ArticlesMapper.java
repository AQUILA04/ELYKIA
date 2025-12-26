package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.entity.Articles;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ArticlesMapper extends BaseMapper<Articles, ArticlesDto> {
}
