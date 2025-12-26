package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.LocalityDto;
import com.optimize.elykia.core.entity.Locality;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface LocalityMapper extends BaseMapper<Locality, LocalityDto> {
}
