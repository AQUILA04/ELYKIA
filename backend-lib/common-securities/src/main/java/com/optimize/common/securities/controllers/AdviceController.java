package com.optimize.common.securities.controllers;

import com.optimize.common.entities.config.CustomMessageSource;
import com.optimize.common.entities.controller.CommonAdviceController;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.exception.InvalidLicenceException;
import com.optimize.common.securities.exception.LicenceExpiredException;
import jakarta.annotation.Priority;
import lombok.extern.slf4j.Slf4j;
import org.apache.catalina.connector.ClientAbortException;
import org.hibernate.exception.ConstraintViolationException;
import org.postgresql.util.PSQLException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.jpa.JpaSystemException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.util.Arrays;
import java.util.Objects;

@ControllerAdvice
@Priority(1)
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j(topic = "EventLog")
public class AdviceController extends CommonAdviceController {
    private final CustomMessageSource messageSource;

    public AdviceController(CustomMessageSource messageSource) {
        super(messageSource);
        this.messageSource = messageSource;
    }

    @ExceptionHandler(value
            =  ResourceNotFoundException.class )
    protected ResponseEntity<Response> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        String bodyOfResponse = this.messageSource.getMessage(ex.getMessage());
        logger(ex);
        if (Objects.isNull(ex.getService())) {
            return new ResponseEntity<>(ResponseUtil.errorResponse(HttpStatus.NOT_FOUND, bodyOfResponse), HttpStatus.NOT_FOUND);
        }else {
            return new ResponseEntity<>(ResponseUtil.errorResponse(HttpStatus.NOT_FOUND, bodyOfResponse, ex.getService()), HttpStatus.NOT_FOUND);
        }
    }

    @ExceptionHandler(value
            =  LicenceExpiredException.class )
    protected ResponseEntity<Response> handleLicenceExpiredException(
            LicenceExpiredException ex, WebRequest request) {
        String bodyOfResponse = this.messageSource.getMessage(ex.getMessage());
        logger(ex);
        return new ResponseEntity<>(ResponseUtil.errorResponse(HttpStatus.BANDWIDTH_LIMIT_EXCEEDED, bodyOfResponse), HttpStatus.OK);
    }

    @ExceptionHandler(value
            =  InvalidLicenceException.class )
    protected ResponseEntity<Response> handleInvalidLicenceException(
            InvalidLicenceException ex, WebRequest request) {
        String bodyOfResponse = this.messageSource.getMessage(ex.getMessage());
        logger(ex);
        return new ResponseEntity<>(ResponseUtil.errorResponse(HttpStatus.BANDWIDTH_LIMIT_EXCEEDED, bodyOfResponse), HttpStatus.OK);
    }

    @ExceptionHandler(value
            =  InvalidDataAccessResourceUsageException.class )
    protected ResponseEntity<Response> handleInvalidDataException(
            InvalidDataAccessResourceUsageException ex, WebRequest request) {
        String bodyOfResponse = this.messageSource.getMessage(ex.getMessage());
        logger(ex);
        return new ResponseEntity<>(ResponseUtil
                .errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, bodyOfResponse),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(value
            =  ApplicationException.class )
    protected ResponseEntity<Response> handleApplicationException(
            ApplicationException ex, WebRequest request) {
        String bodyOfResponse = this.messageSource.getMessage(ex.getMessage());
        logger(ex);
        return new ResponseEntity<>(ResponseUtil
                .errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, bodyOfResponse),
                HttpStatus.OK);
    }

    @ExceptionHandler(value
            =  NullPointerException.class )
    protected ResponseEntity<Response> handleNullPoiException(
            NullPointerException ex, WebRequest request) {
        String bodyOfResponse = this.messageSource.getMessage(ex.getMessage());
        logger(ex);
        return new ResponseEntity<>(ResponseUtil
                .errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, bodyOfResponse),
                HttpStatus.OK);
    }

//    @Override
//    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
//        return super.handleMethodArgumentNotValid(ex, headers, status, request);
//    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String exceptionMessage = ex.getMessage().substring(ex.getMessage().lastIndexOf(";"));
        String key = exceptionMessage.substring(exceptionMessage.lastIndexOf("[") + 1, exceptionMessage.lastIndexOf("]") - 1);
        String bodyOfResponse = this.messageSource.getMessage(key);
        logger(ex);
        return new ResponseEntity<>(ResponseUtil
                .errorResponse(HttpStatus.BAD_REQUEST, bodyOfResponse),
                HttpStatus.BAD_REQUEST);
    }


    @ExceptionHandler(value
            =  ConstraintViolationException.class )
    protected ResponseEntity<Response> constraintException(
            ConstraintViolationException ex, WebRequest request) {
        String bodyOfResponse = this.messageSource.getMessage(ex.getLocalizedMessage());
        logger(ex);
        return new ResponseEntity<>(ResponseUtil
                .errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, bodyOfResponse),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(value
            =  DataIntegrityViolationException.class )
    protected ResponseEntity<Response> dataIntegrityException(
            DataIntegrityViolationException ex, WebRequest request) {
        String bodyOfResponse = this.messageSource.getMessage(ex.getLocalizedMessage());
        logger(ex);
        return new ResponseEntity<>(ResponseUtil
                .errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, bodyOfResponse),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }


    @ExceptionHandler(value
            =  Exception.class )
    public ResponseEntity<Response> handleException(Exception ex) {
        String bodyOfResponse = this.messageSource.getMessage(ex.getMessage());

        if (ex instanceof PSQLException || ex instanceof ConstraintViolationException || ex instanceof DataIntegrityViolationException) {
            bodyOfResponse = "ERROR : VIOLATION DE CONTRAINTE D'UNICITE" + ex.getCause().getLocalizedMessage();
            if (ex instanceof DataIntegrityViolationException dve) {
                final String message = dve.getMostSpecificCause().getMessage();
                final int open = message.lastIndexOf("(") + 1;
                final int close = message.lastIndexOf(")");
                final int length = message.length();
                String constraintValue = message.substring(open, close);
                constraintValue += " " + message.substring(close + 1);
                bodyOfResponse = "VIOLATION DE CONTRAINTE D'INTEGRITE : " +  constraintValue;
            }
            logger(ex);
            return new ResponseEntity<>(ResponseUtil
                    .errorResponse(HttpStatus.CONFLICT, bodyOfResponse),
                    HttpStatus.CONFLICT);
        }

        logger(ex);
        if (ex instanceof InsufficientAuthenticationException) {
            logger(ex);
            return new ResponseEntity<>(ResponseUtil
                    .errorResponse(HttpStatus.UNAUTHORIZED, bodyOfResponse),
                    HttpStatus.UNAUTHORIZED);
        }

        if (ex instanceof JpaSystemException jpaEx) {
            bodyOfResponse = jpaEx.getMostSpecificCause().getMessage();
            logger(ex);
            log.error(Arrays.toString(jpaEx.getStackTrace()));
            return new ResponseEntity<>(ResponseUtil
                    .errorResponse(HttpStatus.UNAUTHORIZED, bodyOfResponse),
                    HttpStatus.UNAUTHORIZED);
        }

        if (ex instanceof ClientAbortException caEx) {
            bodyOfResponse = caEx.getMessage();
            log.error("CLIENT ABORT EXCEPTION  ===> {}",caEx.toString());
        }

        if (ex instanceof DataIntegrityViolationException dgiEx ) {
            bodyOfResponse = "Violation de contrainte d'intégrité : " + dgiEx.getLocalizedMessage();
        }

        if (ex instanceof ConstraintViolationException cvEx ) {
            bodyOfResponse = "Violation de contrainte d'intégrité : " + cvEx.getLocalizedMessage();
        }
        logger(ex);
        return new ResponseEntity<>(ResponseUtil
                .errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, bodyOfResponse),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }


    private void logger(Exception ex) {
        log.error("===> Error Message: {}", ex.toString());
        log.error("===> Error Message: {}", this.messageSource.getMessage(ex.getMessage()));
        log.error(ex.getLocalizedMessage(), ex.getCause());
    }
}
