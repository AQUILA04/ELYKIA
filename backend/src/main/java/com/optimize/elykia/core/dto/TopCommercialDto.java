package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
public class TopCommercialDto {

    private String username;
    private Long memberCount;
    private Double totalCollected;


    public TopCommercialDto(String username, Long memberCount, Double totalCollected) {
        this.username = username;
        this.memberCount = memberCount;
        this.totalCollected = totalCollected;
    }
}
