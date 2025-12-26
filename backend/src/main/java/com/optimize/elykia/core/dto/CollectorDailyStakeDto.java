package com.optimize.elykia.core.dto;

import lombok.Data;

import java.util.List;

@Data
public class CollectorDailyStakeDto {
    private List<Long> clientIds;
    private String collector;
    private List<Long> creditIds;
}
