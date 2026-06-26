package com.optimize.elykia.core.ai.sql;

import com.optimize.common.entities.exception.CustomValidationException;

public class SqlValidationException extends CustomValidationException {

    public SqlValidationException(String message) {
        super(message);
    }
}
