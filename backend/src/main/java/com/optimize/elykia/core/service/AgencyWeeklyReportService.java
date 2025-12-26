package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.entities.util.DateUtils;
import com.optimize.elykia.core.entity.Agency;
import com.optimize.elykia.core.entity.AgencyWeeklyReport;
import com.optimize.elykia.core.enumaration.WeekStatus;
import com.optimize.elykia.core.repository.AgencyWeeklyReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;

@Service
@Transactional
public class AgencyWeeklyReportService extends GenericService<AgencyWeeklyReport, Long> {

    protected AgencyWeeklyReportService(AgencyWeeklyReportRepository repository) {
        super(repository);
    }

    public AgencyWeeklyReport getByStatusAndAgencyId(WeekStatus status, Long agencyId) {
        return getRepository().findByStatusAndAgency_id(status, agencyId).orElseThrow(() -> new ResourceNotFoundException("Rapport de la semaine pour l'agence non trouvé !"));
    }

    public AgencyWeeklyReport addDailyReport(AgencyWeeklyReport weeklyReport) {
        return update(weeklyReport);
    }

    @Transactional
    public AgencyWeeklyReport initAgencyWeekReport(Long agencyId) {
        AgencyWeeklyReport weeklyReport = new AgencyWeeklyReport();
        weeklyReport.setWeekFrom(LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)));
        weeklyReport.setWeekTo(LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.SATURDAY)));
        weeklyReport.setWeekNumber(LocalDate.now().get(WeekFields.ISO.weekOfYear()));
        weeklyReport.setStatus(WeekStatus.CURRENT);
        AgencyWeeklyReport old = getByStatusAndAgencyId(WeekStatus.CURRENT, agencyId);
        old.setStatus(WeekStatus.OLD);
        update(old);
        create(weeklyReport);
        return weeklyReport;
    }

    @Override
    public AgencyWeeklyReportRepository getRepository() {
        return (AgencyWeeklyReportRepository) super.getRepository();
    }
}
