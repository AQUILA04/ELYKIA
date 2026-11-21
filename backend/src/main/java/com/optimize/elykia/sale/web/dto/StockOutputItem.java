package com.optimize.elykia.sale.web.dto;

public record StockOutputItem(Long id,
                              Long stockOutputId,
                              Long articleId,
                              Integer quantity,
                              Double unitPrice) {
}
