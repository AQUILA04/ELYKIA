package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.TontineDto;
import com.optimize.elykia.core.entity.tontine.Tontine;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TontineMapper extends BaseMapper<Tontine, TontineDto> {
}
