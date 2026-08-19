package com.optimize.elykia.core.service.agency;

import com.optimize.elykia.core.dto.AgencyDailyReportDto;
import com.optimize.elykia.core.entity.agency.AgencyDailyReport;
import com.optimize.elykia.core.entity.agency.AgencyWeeklyReport;
import com.optimize.elykia.core.enumaration.WeekStatus;
import com.optimize.elykia.core.mapper.AgencyDailyReportMapper;
import com.optimize.elykia.core.repository.AgencyDailyReportRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgencyDailyReportServiceTest {

    @Mock private AgencyDailyReportRepository dailyReportRepository;
    @Mock private AgencyWeeklyReportService weeklyReportService;
    @Mock private AgencyDailyReportMapper dailyReportMapper;
    @Mock private AgencyDailyReportDto dailyReportDto;

    @Test
    void createDailyReport_validatesBalanceAndPropagatesTheSameAmountsIntoTheCurrentWeeklyReport() {
        // Given
        AgencyDailyReportService service = new AgencyDailyReportService(
                dailyReportRepository, weeklyReportService, dailyReportMapper);
        LocalDate currentDate = LocalDate.now();
        AgencyWeeklyReport weeklyReport = new AgencyWeeklyReport();
        AgencyDailyReport dailyReport = new AgencyDailyReport();
        dailyReport.setCollection(1_200.0);
        dailyReport.setSpending(350.0);
        dailyReport.setBalance(850.0);
        when(dailyReportDto.getAgencyId()).thenReturn(7L);
        when(dailyReportMapper.toEntity(dailyReportDto)).thenReturn(dailyReport);
        when(dailyReportRepository.save(dailyReport)).thenReturn(dailyReport);
        if (currentDate.getDayOfWeek() == DayOfWeek.MONDAY) {
            when(weeklyReportService.initAgencyWeekReport(7L)).thenReturn(weeklyReport);
        } else {
            when(weeklyReportService.getByStatusAndAgencyId(WeekStatus.CURRENT, 7L)).thenReturn(weeklyReport);
        }

        // When
        AgencyDailyReport saved = service.createDailyReport(dailyReportDto);

        // Then
        assertSame(dailyReport, saved);
        assertSame(weeklyReport, saved.getAgencyWeeklyReport());
        assertEquals(currentDate.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.getDefault()),
                saved.getDay());
        assertEquals(1_200.0, weeklyReport.getTotalCollection());
        assertEquals(350.0, weeklyReport.getTotalSpending());
        assertEquals(850.0, weeklyReport.getTotalAmount());
        verify(dailyReportDto).balanceControl();
        verify(weeklyReportService).addDailyReport(weeklyReport);
        verify(dailyReportRepository).save(dailyReport);
    }
}
