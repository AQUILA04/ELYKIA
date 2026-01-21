package com.optimize.common.securities.controllers;

import com.optimize.common.entities.config.CustomMessageSource;
import com.optimize.common.entities.controller.CommonAdviceController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class SecurityAdviceController extends CommonAdviceController {
    public SecurityAdviceController(CustomMessageSource messageSource) {
        super(messageSource);
    }
}
