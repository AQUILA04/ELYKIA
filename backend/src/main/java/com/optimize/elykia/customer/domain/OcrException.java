package com.optimize.elykia.customer.domain;

public class OcrException extends Exception {

    public OcrException(String message) {
        super(message);
    }

    public OcrException(String message, Throwable cause) {
        super(message, cause);
    }
}
