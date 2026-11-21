package com.optimize.elykia.bootstrap.web.dto;

import lombok.Data;
import java.util.List;

@Data
public class ReliquatSyncDto {
    private String commercialId;
    private List<ReliquatSyncUnitDto> reliquats;
}
