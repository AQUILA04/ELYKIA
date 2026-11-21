package com.optimize.elykia.finance.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.finance.web.dto.AgencyWeeklyReportDto;
import com.optimize.elykia.finance.domain.AgencyWeeklyReport;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AgencyWeeklyReportMapper extends BaseMapper<AgencyWeeklyReport, AgencyWeeklyReportDto> {
}
