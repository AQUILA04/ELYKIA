package com.optimize.elykia.tontine.web;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.tontine.domain.TontineDeliveryDuplicateException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

/** Doublon de commande / livraison tontine : 409, avec le message métier tel quel. */
@ControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class TontineDeliveryDuplicateAdvice {

    @ExceptionHandler(TontineDeliveryDuplicateException.class)
    public ResponseEntity<Response> handleDuplicate(TontineDeliveryDuplicateException ex) {
        log.warn("Doublon tontine refusé ({}) : {}", ex.getReason(), ex.getMessage());
        return new ResponseEntity<>(
                ResponseUtil.errorResponse(HttpStatus.CONFLICT, ex.getMessage()),
                HttpStatus.CONFLICT);
    }
}
