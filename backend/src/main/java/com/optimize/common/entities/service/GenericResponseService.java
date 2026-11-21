package com.optimize.common.entities.service;

import org.springframework.http.HttpStatus;

import com.optimize.common.entities.util.Response;

public  abstract class GenericResponseService {

    public Response successResponse(Object data, String message,HttpStatus status,String service){
       return Response.builder()
                .status(status)
                .message(message)
                .service(service)
                .data(data)
                .build();
    }
    public  Response errorResponse(HttpStatus status, String message,String service) {
        return Response.builder()
                .status(status)
                .message(message)
                .service(service)
                .build();
    }
}
