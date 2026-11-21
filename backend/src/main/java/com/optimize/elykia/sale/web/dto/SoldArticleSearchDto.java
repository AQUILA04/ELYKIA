package com.optimize.elykia.sale.web.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class SoldArticleSearchDto {
    private LocalDate startDate;
    private LocalDate endDate;
    private String commercial;
}
