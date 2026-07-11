package com.optimize.elykia.recruitment.admin.api.dto;

import com.optimize.elykia.recruitment.shared.domain.JobOfferStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class JobOfferAdminDto {
    private Long id;
    private String title;
    private String description;
    private List<String> highlights;
    private JobOfferStatus status;
    private String imageUrl;
    private LocalDateTime publishedAt;
    private LocalDateTime withdrawnAt;
    private int displayOrder;
    private LocalDateTime createdDate;
}
