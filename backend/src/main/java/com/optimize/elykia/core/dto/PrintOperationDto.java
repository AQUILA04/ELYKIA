package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.util.DateUtils;
import com.optimize.elykia.core.entity.Credit;
import lombok.Data;

import java.util.*;

@Data
public class PrintOperationDto {
    private List<Credit> credits;
    Map<String, List<Credit>> groupedData = new HashMap<>();
    private String currentDate;
    private String weekFrom;
    private String weekTo;
    private Integer totalElements;
    private String collector;
    private State state =State.ENABLED;


    public static PrintOperationDto from(List<Credit> credits) {
        PrintOperationDto operationDto = new PrintOperationDto();
        if (!credits.isEmpty()) {
            operationDto.setCredits(credits);
            //credits.stream().findFirst().ifPresent(c -> operationDto.setCollector(c.getClient().getCollector()));
            Optional<Credit> creditsOptional = credits.stream().findFirst();
            creditsOptional.ifPresent(credit -> operationDto.setCollector(credit.getCollector()));
            operationDto.setTotalElements(credits.size());
            operationDto.setCurrentDate(DateUtils.currentDateFormat());
            operationDto.setWeekFrom(DateUtils.getWeekStartDateFormat());
            operationDto.setWeekTo(DateUtils.getWeekEndDateFormat());
            Map<String, List<Credit>> grouped = new HashMap<>();
            for (Credit credit : credits) {
                grouped.computeIfAbsent(credit.getClient().getQuarter(), k -> new ArrayList<>())
                        .add(credit);
            }
            operationDto.setGroupedData(grouped);
        }
//        credits.stream().findFirst().ifPresent(credit -> operationDto.setCollector(credit.getCollector()));
        return operationDto;
    }
}
