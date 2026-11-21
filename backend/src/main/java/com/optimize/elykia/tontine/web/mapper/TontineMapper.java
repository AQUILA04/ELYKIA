package com.optimize.elykia.tontine.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.tontine.web.dto.TontineDto;
import com.optimize.elykia.tontine.domain.Tontine;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TontineMapper extends BaseMapper<Tontine, TontineDto> {
}
