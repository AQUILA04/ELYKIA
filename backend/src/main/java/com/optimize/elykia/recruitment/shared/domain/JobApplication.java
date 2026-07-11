package com.optimize.elykia.recruitment.shared.domain;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "job_application")
@Getter
@Setter
@ToString
@NoArgsConstructor
public class JobApplication extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_offer_id", nullable = false)
    private Long jobOfferId;

    @Column(name = "last_name", nullable = false, length = 120)
    private String lastName;

    @Column(name = "first_name", nullable = false, length = 120)
    private String firstName;

    @Column(nullable = false, length = 32)
    private String phone;

    @Column(length = 255)
    private String email;

    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ApplicantGender gender;

    @Column(nullable = false, length = 255)
    private String locality;

    @Column(name = "cv_bucket", length = 128)
    private String cvBucket;

    @Column(name = "cv_key", length = 512)
    private String cvKey;

    @Column(name = "cv_content_type", length = 128)
    private String cvContentType;

    @Column(name = "cv_file_name", length = 255)
    private String cvFileName;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt = LocalDateTime.now();
}
