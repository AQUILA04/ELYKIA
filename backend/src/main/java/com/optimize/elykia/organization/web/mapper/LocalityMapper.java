package com.optimize.elykia.organization.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.organization.web.dto.LocalityDto;
import com.optimize.elykia.organization.domain.Locality;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface LocalityMapper extends BaseMapper<Locality, LocalityDto> {
}
