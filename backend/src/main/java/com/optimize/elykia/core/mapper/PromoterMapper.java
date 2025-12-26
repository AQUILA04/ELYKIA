package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.PromoterDto;
import com.optimize.elykia.core.entity.Promoter;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PromoterMapper extends BaseMapper<Promoter, PromoterDto> {
}
