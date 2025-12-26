package com.optimize.elykia.core.dto;

public record StockOutputItem(Long id,
                              Long stockOutputId,
                              Long articleId,
                              Integer quantity,
                              Double unitPrice) {
}
