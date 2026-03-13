package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Data;

import java.util.List;

@Data
public class ItemReleaseSheetDto {
    private String collector;
    private String date;
    private Double totalPrice;
    private List<DownloadData> articles;
    private State state =State.ENABLED;

}
