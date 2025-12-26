package com.optimize.elykia.core.dto;

import lombok.Data;

import java.util.List;

@Data
public class ItemReleaseSheetDto {
    private String collector;
    private String date;
    private Double totalPrice;
    private List<DownloadData> articles;
}
