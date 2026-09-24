package com.optimize.elykia.core.ai.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.ai.llm.AiProviderUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

/**
 * Renvoie un 503 explicite quand le fournisseur LLM est saturé, au lieu du 500
 * générique du CommonAdviceController.
 */
@ControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
@Slf4j(topic = "EventLog")
public class AiExceptionAdvice {

    @ExceptionHandler(AiProviderUnavailableException.class)
    public ResponseEntity<Response> handleProviderUnavailable(AiProviderUnavailableException ex) {
        log.warn("ai.provider.unavailable: {}", ex.getMessage(), ex);
        return new ResponseEntity<>(
                ResponseUtil.errorResponse(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage()),
                HttpStatus.SERVICE_UNAVAILABLE);
    }
}
