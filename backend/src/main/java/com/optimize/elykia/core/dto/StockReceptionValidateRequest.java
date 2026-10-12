package com.optimize.elykia.core.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class StockReceptionValidateRequest {

    private List<Line> items = new ArrayList<>();

    @Data
    public static class Line {
        private Long itemId;
        private Double unitPrice;
        private Double packagePrice;
    }
}
