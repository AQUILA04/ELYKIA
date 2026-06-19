package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerArticleDto {
    private String id;
    private String name;
    private String description;
    private String category;
    private double creditSalePrice;
    private String imageUrl;
    private boolean available;
}
