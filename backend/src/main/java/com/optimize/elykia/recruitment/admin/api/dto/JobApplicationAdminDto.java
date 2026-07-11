package com.optimize.elykia.recruitment.admin.api.dto;

import com.optimize.elykia.recruitment.shared.domain.ApplicantGender;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class JobApplicationAdminDto {
    private Long id;
    private Long jobOfferId;
    private String jobOfferTitle;
    private String lastName;
    private String firstName;
    private String phone;
    private String email;
    private LocalDate birthDate;
    private ApplicantGender gender;
    private String locality;
    private String cvFileName;
    private LocalDateTime submittedAt;
}
