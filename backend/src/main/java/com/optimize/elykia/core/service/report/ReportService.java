package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.util.DateUtils;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.AccountingReportDto;
import com.optimize.elykia.core.dto.DownloadData;
import com.optimize.elykia.core.dto.ItemReleaseSheetDto;
import com.optimize.elykia.core.entity.DailyAccountancy;
import com.optimize.elykia.core.entity.view.AccountancyReportView;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.PeriodState;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.DailyAccountingRepository;
import com.optimize.elykia.core.repository.view.AccountancyReportRepository;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.service.accounting.DailyAccountancyService;
import com.optimize.elykia.core.util.ReportPeriod;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final AccountancyReportRepository accountancyReportRepository;
    private final DailyAccountingRepository dailyAccountingRepository;
    private final DailyAccountancyService dailyAccountancyService;
    @Getter
    private final CreditRepository creditRepository;
    private final AccountingDayService accountingDayService;

    public List<AccountancyReportView> getAccountancyReports(PeriodState periodState) {
        ReportPeriod period = ReportPeriod.from(periodState);
        List<AccountancyReportView> reports = new ArrayList<>(accountancyReportRepository.sumByPeriod(period.getDateFrom(), period.getDateTo()).values());

        return reports.stream().peek(report -> report.setReleasedTotalAmount(creditRepository
                .sumByBeginDateGreaterThanEqualAndBeginDateLessThanEqualAndCollector(period.getDateFrom(), period.getDateTo(),
                        report.getCollector(), List.of(CreditStatus.INPROGRESS.name(), CreditStatus.SETTLED.name(), CreditStatus.ENDED.name())))).toList();
    }

    public AccountingReportDto getTotalCollectedAmountByPeriod(PeriodState periodState) {
        ReportPeriod period = ReportPeriod.from(periodState);
        return AccountingReportDto.builder()
                .totalAmount(dailyAccountingRepository.sumByPeriod(period.getDateFrom(), period.getDateTo()))
                .dateFrom(period.getDateFrom())
                .dateTo(period.getDateTo())
                .releasedTotalAmount(creditRepository.sumByBeginDateGreaterThanEqualAndBeginDateLessThanEqual(period.getDateFrom(),
                        period.getDateTo(), List.of(CreditStatus.INPROGRESS.name(), CreditStatus.SETTLED.name(), CreditStatus.ENDED.name())))
                .build();
    }

    public List<DailyAccountancy> getOperationsByCollectorAndPeriod(PeriodState period, String collector) {
        return dailyAccountancyService.getCollectorAccountancyByPeriod(period, collector);
    }

    public ItemReleaseSheetDto getItemReleaseSheetByCollector(String collector, LocalDate releaseDate) {
        ItemReleaseSheetDto dto = new ItemReleaseSheetDto();
        LocalDate now ;
        try {
            if (Objects.nonNull(releaseDate)) {
                now = releaseDate;
            } else {
                now = accountingDayService.getCurrentAccountingDate();
            }
        }catch (ResourceNotFoundException ex){
            now= LocalDate.now();
        }
        List<DownloadData> articles;
        if ("TOUT".equals(collector)) {
            articles = creditRepository.getReleaseDownloadData(now, ClientType.PROMOTER);
        } else {
            articles = creditRepository.getDownloadDataByCollector(now, collector, ClientType.PROMOTER);
        }


        dto.setCollector(collector);
        dto.setDate(DateUtils.simpleDateFormat(now));
        dto.setArticles(articles);
        dto.setTotalPrice(articles.stream().mapToDouble(DownloadData::getTotalPrice).sum());
        return dto;
    }

    public List<ItemReleaseSheetDto> getItemReleaseSheetByCurrentDate() {
        List<ItemReleaseSheetDto>  dtos = new ArrayList<>();
        List<String> collectors = creditRepository.getCollectorWhoReleaseItemCurrentDate(LocalDate.now(), ClientType.PROMOTER);
        collectors.forEach(collector -> dtos.add(getItemReleaseSheetByCollector(collector, null)));
        return dtos;
    }

}
