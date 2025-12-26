package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.AgencyWeeklyDepositDto;
import com.optimize.elykia.core.entity.AgencyWeeklyDeposit;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AgencyWeeklyDepositMapper extends BaseMapper<AgencyWeeklyDeposit, AgencyWeeklyDepositDto> {
}
