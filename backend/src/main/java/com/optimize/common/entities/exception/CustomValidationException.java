package com.optimize.common.entities.exception;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class CustomValidationException extends RuntimeException {
    private Map<String, Object> data;
    private String service;

    public CustomValidationException() {
    }

    public CustomValidationException(String message) {
        super(message);
    }

    public CustomValidationException(String message, Map<String, Object> data, String service) {
        super(message);
        this.data = data;
        this.service = service;
    }

    public CustomValidationException(String message, String service) {
        super(message);
        this.service = service;
    }
}
