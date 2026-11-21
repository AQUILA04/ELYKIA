package com.optimize.elykia.finance.application;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.finance.web.dto.AgencyWeeklyDepositDto;
import com.optimize.elykia.finance.domain.AgencyWeeklyDeposit;
import com.optimize.elykia.finance.domain.AgencyWeeklyReport;
import com.optimize.elykia.finance.domain.WeekStatus;
import com.optimize.elykia.finance.web.mapper.AgencyWeeklyDepositMapper;
import com.optimize.elykia.finance.infrastructure.persistence.AgencyWeeklyDepositRepository;
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
