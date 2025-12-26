package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.AgencyDailyReportDto;
import com.optimize.elykia.core.entity.AgencyDailyReport;
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
