package com.optimize.elykia.core.dto;

import com.optimize.common.entities.util.DateUtils;
import lombok.Data;

import java.util.*;

@Data
public class PrintOperationDto {
    private List<DailyUnrecoveredCreditDto> credits;
    Map<String, List<DailyUnrecoveredCreditDto>> groupedData = new HashMap<>();
    private String currentDate;
    private String weekFrom;
    private String weekTo;
    private Integer totalElements;
    private String collector;

    public static PrintOperationDto from(List<DailyUnrecoveredCreditDto> credits, String collector) {
        PrintOperationDto operationDto = new PrintOperationDto();
        operationDto.setCollector(collector);
        if (credits == null || credits.isEmpty()) {
            operationDto.setCredits(Collections.emptyList());
            operationDto.setTotalElements(0);
            operationDto.setGroupedData(Collections.emptyMap());
            return operationDto;
        }

        operationDto.setCredits(credits);
        operationDto.setTotalElements(credits.size());
        operationDto.setCurrentDate(DateUtils.currentDateFormat());
        operationDto.setWeekFrom(DateUtils.getWeekStartDateFormat());
        operationDto.setWeekTo(DateUtils.getWeekEndDateFormat());

        Map<String, List<DailyUnrecoveredCreditDto>> grouped = new LinkedHashMap<>();
        for (DailyUnrecoveredCreditDto credit : credits) {
            String quarter = credit.getClientQuarter() != null ? credit.getClientQuarter() : "Non renseigné";
            grouped.computeIfAbsent(quarter, k -> new ArrayList<>()).add(credit);
        }
        operationDto.setGroupedData(grouped);
        return operationDto;
    }
}
