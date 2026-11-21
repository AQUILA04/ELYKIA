package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.StockRequestStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
public class StockRequestListDto {
    private Long id;
    private String reference;
    private String collector;
    private LocalDate requestDate;
    private LocalDate validationDate;
    private LocalDate deliveryDate;
    private StockRequestStatus status;
    private List<String> linkedOrderReferences = new ArrayList<>();
    private String cashSaleReference;

    public StockRequestListDto(
            Long id,
            String reference,
            String collector,
            LocalDate requestDate,
            LocalDate validationDate,
            LocalDate deliveryDate,
            StockRequestStatus status) {
        this.id = id;
        this.reference = reference;
        this.collector = collector;
        this.requestDate = requestDate;
        this.validationDate = validationDate;
        this.deliveryDate = deliveryDate;
        this.status = status;
    }
}
