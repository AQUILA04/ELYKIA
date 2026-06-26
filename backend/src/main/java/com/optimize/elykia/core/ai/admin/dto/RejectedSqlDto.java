package com.optimize.elykia.core.ai.admin.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RejectedSqlDto {
    private String question;
    private String sql;
    private String error;
    private String username;
    private LocalDateTime createdAt;
}
