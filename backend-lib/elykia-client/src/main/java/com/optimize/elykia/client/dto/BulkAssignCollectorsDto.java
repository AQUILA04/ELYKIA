package com.optimize.elykia.client.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkAssignCollectorsDto {

    @NotEmpty(message = "La liste des IDs client ne peut pas être vide")
    private List<Long> clientIds;

    private String collector;

    private String tontineCollector;
}
