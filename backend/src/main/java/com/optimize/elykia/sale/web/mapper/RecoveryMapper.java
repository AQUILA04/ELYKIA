package com.optimize.elykia.sale.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.sale.web.dto.RecoveryDto;
import com.optimize.elykia.sale.domain.Recovery;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RecoveryMapper extends BaseMapper<Recovery, RecoveryDto> {


}
