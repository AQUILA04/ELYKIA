package com.optimize.elykia.inventory.web.dto;

import com.optimize.elykia.inventory.domain.ReceptionStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
public class StockReceptionListDto {
    private Long id;
    private String reference;
    private LocalDate receptionDate;
    private String receivedBy;
    private Double totalAmount;
    private ReceptionStatus status;

    public StockReceptionListDto(
            Long id,
            String reference,
            LocalDate receptionDate,
            String receivedBy,
            Double totalAmount,
            ReceptionStatus status) {
        this.id = id;
        this.reference = reference;
        this.receptionDate = receptionDate;
        this.receivedBy = receivedBy;
        this.totalAmount = totalAmount;
        this.status = status;
    }
}
