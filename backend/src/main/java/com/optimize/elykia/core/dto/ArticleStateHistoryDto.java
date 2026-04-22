package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleStateHistoryDto {
    private Long id;
    private State previousState;
    private State newState;
    private LocalDateTime createdDate;
    private String createdBy;
}
