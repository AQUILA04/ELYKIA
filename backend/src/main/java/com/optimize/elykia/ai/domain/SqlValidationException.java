package com.optimize.elykia.ai.domain;

import com.optimize.common.entities.exception.CustomValidationException;

public class SqlValidationException extends CustomValidationException {

    public SqlValidationException(String message) {
        super(message);
    }
}
