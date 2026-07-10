package com.optimize.elykia.core.dto.stock;

import com.optimize.elykia.core.enumaration.StockReturnStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
public class StockTontineReturnListDto {
    private Long id;
    private LocalDate returnDate;
    private LocalDate receivedDate;
    private String collector;
    private StockReturnStatus status;

    public StockTontineReturnListDto(Long id, LocalDate returnDate, LocalDate receivedDate, String collector, StockReturnStatus status) {
        this.id = id;
        this.returnDate = returnDate;
        this.receivedDate = receivedDate;
        this.collector = collector;
        this.status = status;
    }
}
