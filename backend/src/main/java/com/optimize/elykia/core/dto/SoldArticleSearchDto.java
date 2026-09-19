package com.optimize.elykia.core.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class SoldArticleSearchDto {
    private LocalDate startDate;
    private LocalDate endDate;
    private String commercial;
}
