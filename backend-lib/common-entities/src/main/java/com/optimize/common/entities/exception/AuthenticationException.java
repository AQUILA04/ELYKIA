package com.optimize.common.entities.exception;

import java.util.Map;

public class AuthenticationException extends RuntimeException {
    private Map<String, Object> data;
    private String service;

    public AuthenticationException() {
    }

    public AuthenticationException(String message) {
        super(message);
    }

    public AuthenticationException(String message, String service) {
        super(message);
        this.service = service;
    }

    public AuthenticationException(String message, Map<String, Object> data, String service) {
        super(message);
        this.data = data;
        this.service = service;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }

    public String getService() {
        return service;
    }

    public void setService(String service) {
        this.service = service;
    }
}
