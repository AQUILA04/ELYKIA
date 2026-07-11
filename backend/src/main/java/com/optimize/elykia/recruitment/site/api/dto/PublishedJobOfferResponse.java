package com.optimize.elykia.recruitment.site.api.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PublishedJobOfferResponse {
    private Long id;
    private String title;
    private String description;
    private List<String> highlights;
    private String imageUrl;
    private int displayOrder;
}
