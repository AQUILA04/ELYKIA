package com.optimize.common.entities.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;

@Slf4j(topic = "EventLog")
public class ResponseUtil {

    private static final String SERVICE = "OPTIMIZE-SERVICE";
    private ResponseUtil() {
        //Default constructor
    }

    public static Response successResponse(Object data) {
        log.info("==>SUCCESS RESPONSE : {}", data);
        return Response.builder()
                .status(HttpStatus.OK)
                .statusCode(HttpStatus.OK.value())
                .message("default.message.success")
                .service(SERVICE)
                .data(data).build();
    }

    public static Response successResponse(Object data, String message) {
        log.info("===>SUCCESS RESPONSE : {}", data);
        return Response.builder()
                .status(HttpStatus.OK)
                .statusCode(HttpStatus.OK.value())
                .message(message)
                .service(SERVICE)
                .data(data).build();
    }

    public static Response successResponse(Object data, String message, HttpStatus status, String service) {
        log.info("===>SUCCESS RESPONSE : {}", data);
        return Response.builder()
                .status(HttpStatus.OK)
                .statusCode(status.value())
                .message(message)
                .service(service)
                .data(data).build();
    }

    public static Response successResponse(Object data, String message, HttpStatus status) {
        log.info("===>SUCCESS RESPONSE : {}", data);
        return Response.builder()
                .status(status)
                .statusCode(status.value())
                .message(message)
                .service(SERVICE)
                .data(data).build();
    }

    public static Response errorResponse(HttpStatus status, String message) {
        return Response.builder()
                .status(status)
                .statusCode(status.value())
                .message(message)
                .service(SERVICE)
                .data(null).build();
    }


    public static Response errorResponse(HttpStatus status, String message , String service) {
        return Response.builder()
                .status(status)
                .statusCode(status.value())
                .message(message)
                .service(service)
                .data(null).build();
    }
}
