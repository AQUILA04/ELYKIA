package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Data;

@Data
public class ExpenseTypeDto {
    private Long id;
    private String name;
    private String code;
    private String description;
    private State state =State.ENABLED;

}
