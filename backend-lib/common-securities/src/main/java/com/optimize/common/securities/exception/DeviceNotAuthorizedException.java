package com.optimize.common.securities.exception;

import lombok.Getter;

@Getter
public class DeviceNotAuthorizedException extends RuntimeException {

    public static final String ERROR_CODE = "DEVICE_NOT_AUTHORIZED";

    public DeviceNotAuthorizedException(String message) {
        super(message);
    }
}
