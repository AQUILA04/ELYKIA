package com.optimize.elykia.core.dto;

import lombok.Data;
import java.util.List;

@Data
public class ReliquatSyncDto {
    private String commercialId;
    private List<ReliquatSyncUnitDto> reliquats;
}
