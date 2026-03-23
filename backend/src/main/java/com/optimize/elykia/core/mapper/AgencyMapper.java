package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.AgencyDto;
import com.optimize.elykia.core.entity.agency.Agency;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AgencyMapper extends BaseMapper<Agency, AgencyDto> {
}
