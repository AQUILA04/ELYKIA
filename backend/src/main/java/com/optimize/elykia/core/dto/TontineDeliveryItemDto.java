package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TontineDeliveryItemDto {
    
    private Long id;
    private Long articleId;
    private String articleName;
    private String articleCode;
    private Integer quantity;
    private Double unitPrice;
    private Double totalPrice;
    private State state =State.ENABLED;

}
