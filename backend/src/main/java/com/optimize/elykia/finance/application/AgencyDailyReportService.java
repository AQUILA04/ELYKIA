package com.optimize.elykia.finance.application;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.finance.web.dto.AgencyDailyReportDto;
import com.optimize.elykia.finance.domain.AgencyDailyReport;
import com.optimize.elykia.finance.domain.AgencyWeeklyReport;
import com.optimize.elykia.finance.domain.WeekStatus;
import com.optimize.elykia.finance.web.mapper.AgencyDailyReportMapper;
import com.optimize.elykia.finance.infrastructure.persistence.AgencyDailyReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;

@Service
@Transactional
public class AgencyDailyReportService extends GenericService<AgencyDailyReport, Long> {

    private final AgencyWeeklyReportService agencyWeeklyReportService;
    private final AgencyDailyReportMapper agencyDailyReportMapper;

    protected AgencyDailyReportService(AgencyDailyReportRepository repository,
                                       AgencyWeeklyReportService agencyWeeklyReportService,
                                       AgencyDailyReportMapper agencyDailyReportMapper) {
        super(repository);
        this.agencyWeeklyReportService = agencyWeeklyReportService;
        this.agencyDailyReportMapper = agencyDailyReportMapper;
    }

    @Transactional
    public AgencyDailyReport createDailyReport(AgencyDailyReportDto dailyReportDto) {
        dailyReportDto.balanceControl();
        LocalDate currentDate = LocalDate.now();
        LocalDate firstDate = currentDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        AgencyWeeklyReport weeklyReport;
        if (currentDate.isEqual(firstDate)) {
            weeklyReport = agencyWeeklyReportService.initAgencyWeekReport(dailyReportDto.getAgencyId());
        } else {
            weeklyReport = agencyWeeklyReportService.getByStatusAndAgencyId(WeekStatus.CURRENT, dailyReportDto.getAgencyId());
        }
        AgencyDailyReport dailyReport = this.agencyDailyReportMapper.toEntity(dailyReportDto);
        dailyReport.setAgencyWeeklyReport(weeklyReport);
        dailyReport.setDay(currentDate.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.getDefault()));
        weeklyReport.addDailyReport(dailyReport.getCollection(), dailyReport.getSpending(), dailyReport.getBalance());
        agencyWeeklyReportService.addDailyReport(weeklyReport);
        return create(dailyReport);
    }
}
