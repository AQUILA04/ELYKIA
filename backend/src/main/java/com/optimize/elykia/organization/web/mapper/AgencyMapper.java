package com.optimize.elykia.organization.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.organization.web.dto.AgencyDto;
import com.optimize.elykia.organization.domain.Agency;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AgencyMapper extends BaseMapper<Agency, AgencyDto> {
}
