package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

/**
 * Expose la cause métier derrière un UnexpectedRollbackException
 * (souvent masquée quand une exception est catchée dans une @Transactional englobante).
 */
@ControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j(topic = "EventLog")
public class TransactionRollbackAdvice {

    @ExceptionHandler(UnexpectedRollbackException.class)
    public ResponseEntity<Response> handleUnexpectedRollback(UnexpectedRollbackException ex) {
        Throwable root = ex;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String message = root.getMessage() != null ? root.getMessage() : ex.getMessage();
        log.error("===> UnexpectedRollbackException: {}", ex.getMessage(), ex);
        if (root != ex) {
            log.error("===> Root cause: {}", message, root);
        }
        return new ResponseEntity<>(
                ResponseUtil.errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, message),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
