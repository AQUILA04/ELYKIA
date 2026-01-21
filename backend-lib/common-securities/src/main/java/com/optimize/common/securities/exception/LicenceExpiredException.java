package com.optimize.common.securities.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(code = HttpStatus.OK)
public class LicenceExpiredException extends RuntimeException {
    public LicenceExpiredException() {
        super("Licence expiré !");
    }

    public LicenceExpiredException(String message) {
        super(message);
    }
}
