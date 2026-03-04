package com.optimize.elykia.core.service.agency;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.AgencyWeeklyDepositDto;
import com.optimize.elykia.core.entity.AgencyWeeklyDeposit;
import com.optimize.elykia.core.entity.AgencyWeeklyReport;
import com.optimize.elykia.core.enumaration.WeekStatus;
import com.optimize.elykia.core.mapper.AgencyWeeklyDepositMapper;
import com.optimize.elykia.core.repository.AgencyWeeklyDepositRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AgencyWeeklyDepositService extends GenericService<AgencyWeeklyDeposit, Long> {
    private final AgencyWeeklyDepositMapper agencyWeeklyDepositMapper;
    private final AgencyWeeklyReportService agencyWeeklyReportService;
    protected AgencyWeeklyDepositService(AgencyWeeklyDepositRepository repository,
                                         AgencyWeeklyDepositMapper agencyWeeklyDepositMapper,
                                         AgencyWeeklyReportService agencyWeeklyReportService) {
        super(repository);
        this.agencyWeeklyDepositMapper = agencyWeeklyDepositMapper;
        this.agencyWeeklyReportService = agencyWeeklyReportService;
    }

    @Transactional
    public AgencyWeeklyDeposit makeWeeklyDeposit(AgencyWeeklyDepositDto dto) {
        AgencyWeeklyDeposit weeklyDeposit = this.agencyWeeklyDepositMapper.toEntity(dto);
        AgencyWeeklyReport weeklyReport = this.agencyWeeklyReportService.getByStatusAndAgencyId(WeekStatus.CURRENT, dto.getAgencyId());
        weeklyDeposit.setAgencyWeeklyReport(weeklyReport);
        weeklyDeposit.irregularityControl();
        return create(weeklyDeposit);
    }
}
