package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ArticleTypeDto {
    private Long id;
    
    @NotBlank
    private String name;
    
    private String code;
    
    private String description;
    private State state =State.ENABLED;

}
