package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.AgencyWeeklyReportDto;
import com.optimize.elykia.core.entity.AgencyWeeklyReport;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AgencyWeeklyReportMapper extends BaseMapper<AgencyWeeklyReport, AgencyWeeklyReportDto> {
}
