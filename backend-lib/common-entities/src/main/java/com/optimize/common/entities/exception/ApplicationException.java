package com.optimize.common.entities.exception;

import java.util.Map;

public class ApplicationException extends RuntimeException{
    private static final long serialVersionUID = 1L;
    private Map<String, Object> data;
    private String service;

    public ApplicationException() {
    }

    public ApplicationException(Exception ex) {
        this(ex.getMessage(), ex.getCause(), false, true);
    }

    public ApplicationException(String message, Throwable cause, boolean enableSuppression, boolean writableStackTrace) {
        super(message, cause, enableSuppression, writableStackTrace);
    }

    public ApplicationException(Throwable cause) {
        super(cause);
    }

    public ApplicationException(String message, Throwable cause) {
        super(message, cause);
    }

    public ApplicationException(String message) {
        super(message);
    }
    public ApplicationException(String message, String service) {
        super(message);
        this.service = service;
    }

    public ApplicationException(String message, Map<String, Object> data) {
        super(message);
        this.data = data;
    }

    public Map<String, Object> getData() {
        return this.data;
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
