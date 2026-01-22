package com.optimize.common.entities.annotations;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;


public class NotStringValueValidator implements ConstraintValidator<NotStringValue, String> {

    @Override
    public void initialize(NotStringValue constraintAnnotation) {
        // This method can be left empty
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || !value.equalsIgnoreCase("string");
    }
}
