package com.optimize.common.entities.util;

import lombok.Builder;
import lombok.Data;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
public class Response {
    private HttpStatus status;
    private int statusCode;
    private String message;
    private String service;
    private Object data;

    public static Response errorResponse(HttpStatus status, String message, String service) {
        return Response.builder()
                .status(status)
                .statusCode(status.value())
                .message(message)
                .service(service)
                .data(null).build();
    }

    public static Response errorResponse(HttpStatus status, List<?> message, String service) {
        return Response.builder()
                .status(status)
                .statusCode(status.value())
                .message(message.stream().map(Object::toString).collect(Collectors.joining()))
                .service(service)
                .data(null).build();
    }
}
