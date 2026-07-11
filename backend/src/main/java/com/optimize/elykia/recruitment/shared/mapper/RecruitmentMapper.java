package com.optimize.elykia.recruitment.shared.mapper;

import com.optimize.elykia.recruitment.admin.api.dto.JobApplicationAdminDto;
import com.optimize.elykia.recruitment.admin.api.dto.JobOfferAdminDto;
import com.optimize.elykia.recruitment.shared.domain.JobApplication;
import com.optimize.elykia.recruitment.shared.domain.JobOffer;
import com.optimize.elykia.recruitment.site.api.dto.PublishedJobOfferResponse;
import org.springframework.stereotype.Component;

@Component
public class RecruitmentMapper {

    public PublishedJobOfferResponse toPublishedResponse(JobOffer offer) {
        return PublishedJobOfferResponse.builder()
                .id(offer.getId())
                .title(offer.getTitle())
                .description(offer.getDescription())
                .highlights(offer.getHighlights())
                .imageUrl(offer.getImageUrl())
                .displayOrder(offer.getDisplayOrder())
                .build();
    }

    public JobOfferAdminDto toAdminDto(JobOffer offer) {
        return JobOfferAdminDto.builder()
                .id(offer.getId())
                .title(offer.getTitle())
                .description(offer.getDescription())
                .highlights(offer.getHighlights())
                .status(offer.getStatus())
                .imageUrl(offer.getImageUrl())
                .publishedAt(offer.getPublishedAt())
                .withdrawnAt(offer.getWithdrawnAt())
                .displayOrder(offer.getDisplayOrder())
                .createdDate(offer.getCreatedDate())
                .build();
    }

    public JobApplicationAdminDto toAdminDto(JobApplication application, String jobOfferTitle) {
        return JobApplicationAdminDto.builder()
                .id(application.getId())
                .jobOfferId(application.getJobOfferId())
                .jobOfferTitle(jobOfferTitle)
                .lastName(application.getLastName())
                .firstName(application.getFirstName())
                .phone(application.getPhone())
                .email(application.getEmail())
                .birthDate(application.getBirthDate())
                .gender(application.getGender())
                .locality(application.getLocality())
                .cvFileName(application.getCvFileName())
                .submittedAt(application.getSubmittedAt())
                .build();
    }
}
