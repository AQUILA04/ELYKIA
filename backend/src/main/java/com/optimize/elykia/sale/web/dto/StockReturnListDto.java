package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.StockReturnStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
public class StockReturnListDto {
    private Long id;
    private LocalDate returnDate;
    private LocalDate receivedDate;
    private String collector;
    private StockReturnStatus status;

    public StockReturnListDto(Long id, LocalDate returnDate, LocalDate receivedDate, String collector, StockReturnStatus status) {
        this.id = id;
        this.returnDate = returnDate;
        this.receivedDate = receivedDate;
        this.collector = collector;
        this.status = status;
    }
}
