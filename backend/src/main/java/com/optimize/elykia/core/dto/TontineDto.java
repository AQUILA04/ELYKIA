package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Data;

@Data
public class TontineDto {
    private Long id;
    private State state =State.ENABLED;

}
