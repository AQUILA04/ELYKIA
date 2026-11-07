package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PendingOrderStockPreviewDto {
    private int orderCount;
    private List<Group> groups;

    @Data
    @Builder
    public static class Group {
        private String collector;
        private List<Long> orderIds;
        private List<ArticleLine> articles;
    }

    @Data
    @Builder
    public static class ArticleLine {
        private String name;
        private int quantity;
    }
}
