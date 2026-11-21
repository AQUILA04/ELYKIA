package com.optimize.common.entities.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ValidationErrorDTO {
    private String field;
    private String message;

    public ValidationErrorDTO(String field, String message) {
        this.field = field;
        this.message = message;
    }
}
