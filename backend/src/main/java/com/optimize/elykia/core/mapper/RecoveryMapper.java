package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.RecoveryDto;
import com.optimize.elykia.core.entity.Recovery;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RecoveryMapper extends BaseMapper<Recovery, RecoveryDto> {


}
