package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PromoterDto {
    private Long id;
    private String name;
    private String serialNumber;
    private LocalDate dateOfBirth;
    private String phoneNumber;
    private State state =State.ENABLED;

}
