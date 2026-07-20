package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleStockTrajectoryDto {
    private Long articleId;
    private String articleName;
    private String articleMarque;
    private String articleModel;
    private InventoryCheckpointDto from;
    private LocalDate toDate;
    private Integer reconstructedQuantity;
    private Integer currentSystemQuantity;
    private Integer drift;
    private TrajectorySummaryDto summary;
    @Builder.Default
    private List<TimelineNodeDto> nodes = new ArrayList<>();
}
