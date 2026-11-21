package com.optimize.elykia.finance.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.finance.web.dto.AgencyDailyReportDto;
import com.optimize.elykia.finance.domain.AgencyDailyReport;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AgencyDailyReportMapper extends BaseMapper<AgencyDailyReport, AgencyDailyReportDto> {

    @Override
    @Mapping(source = "agencyId", target = "agency.id")
    AgencyDailyReport toEntity(AgencyDailyReportDto dto);

    @Override
    @Mapping(source = "agency.id", target = "agencyId")
    AgencyDailyReportDto toDto(AgencyDailyReport entity);
}
