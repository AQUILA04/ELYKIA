package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class CreditDistributionDto {
    private Long creditParentId;
    private String parentReference;
    private Long articleId;
    private String articleName;
    private String brand;
    private String model;
    private Integer parentQuantity;
    private Long distributedQuantity;
    private Long undistributedQuantity;
    private State state =State.ENABLED;

}
