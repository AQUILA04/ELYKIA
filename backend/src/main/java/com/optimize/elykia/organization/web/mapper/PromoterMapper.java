package com.optimize.elykia.organization.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.organization.web.dto.PromoterDto;
import com.optimize.elykia.organization.domain.Promoter;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PromoterMapper extends BaseMapper<Promoter, PromoterDto> {
}
