package com.optimize.elykia.reporting.web.dto;

import com.optimize.elykia.sale.web.dto.DownloadData;
import lombok.Data;

import java.util.List;

@Data
public class ItemReleaseSheetDto {
    private String collector;
    private String date;
    private Double totalPrice;
    private List<DownloadData> articles;
}
