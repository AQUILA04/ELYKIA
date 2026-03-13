package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Data;

@Data
public class LocalityDto {
    private Long id;
    private String name;
    private State state =State.ENABLED;

}
