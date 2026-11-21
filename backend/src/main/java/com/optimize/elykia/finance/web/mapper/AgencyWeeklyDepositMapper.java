package com.optimize.elykia.finance.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.finance.web.dto.AgencyWeeklyDepositDto;
import com.optimize.elykia.finance.domain.AgencyWeeklyDeposit;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AgencyWeeklyDepositMapper extends BaseMapper<AgencyWeeklyDeposit, AgencyWeeklyDepositDto> {
}
