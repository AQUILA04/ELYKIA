package com.optimize.common.securities.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class ErrorMessage {
    private int status;
    private LocalDate localDate;
    private String message;
    private String description;
}
