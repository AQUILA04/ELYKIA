package com.optimize.elykia.recruitment.admin.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class JobOfferUpsertDto {
    @NotBlank
    private String title;
    private String description;
  private List<String> highlights = new ArrayList<>();
    @NotNull
    private Integer displayOrder = 0;
}
