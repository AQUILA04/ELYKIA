package com.optimize.elykia.bi.web.dto;

import com.optimize.elykia.inventory.web.dto.StockMetricsDto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardOverviewDto {
    private SalesMetricsDto sales;
    private CollectionMetricsDto collections;
    private StockMetricsDto stock;
    private PortfolioMetricsDto portfolio;
}
