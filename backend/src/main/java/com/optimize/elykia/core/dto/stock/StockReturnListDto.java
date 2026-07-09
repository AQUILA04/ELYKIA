package com.optimize.elykia.core.dto.stock;

import com.optimize.elykia.core.enumaration.StockReturnStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
public class StockReturnListDto {
    private Long id;
    private LocalDate returnDate;
    private String collector;
    private StockReturnStatus status;

    public StockReturnListDto(Long id, LocalDate returnDate, String collector, StockReturnStatus status) {
        this.id = id;
        this.returnDate = returnDate;
        this.collector = collector;
        this.status = status;
    }
}
