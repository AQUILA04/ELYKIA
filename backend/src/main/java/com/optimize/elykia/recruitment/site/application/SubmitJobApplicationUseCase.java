package com.optimize.elykia.recruitment.site.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.recruitment.RecruitmentProperties;
import com.optimize.elykia.recruitment.shared.domain.ApplicantGender;
import com.optimize.elykia.recruitment.shared.domain.JobApplication;
import com.optimize.elykia.recruitment.shared.domain.JobOffer;
import com.optimize.elykia.recruitment.shared.domain.JobOfferStatus;
import com.optimize.elykia.recruitment.shared.infrastructure.persistence.JobApplicationRepository;
import com.optimize.elykia.recruitment.shared.infrastructure.persistence.JobOfferRepository;
import com.optimize.elykia.recruitment.shared.infrastructure.storage.RecruitmentObjectKeyBuilder;
import com.optimize.elykia.recruitment.shared.infrastructure.storage.RecruitmentStoragePort;
import com.optimize.elykia.recruitment.shared.util.RecruitmentPhoneNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SubmitJobApplicationUseCase {

    private static final Set<String> ALLOWED_CV_TYPES = Set.of(
            "application/pdf", "image/jpeg", "image/jpg", "image/png");

    private final JobOfferRepository jobOfferRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final RecruitmentStoragePort recruitmentStoragePort;
    private final RecruitmentProperties recruitmentProperties;
    private final RecruitmentApplicationRateLimiter rateLimiter;

    @Transactional
    public Long execute(
            Long jobOfferId,
            String firstName,
            String lastName,
            String phone,
            String email,
            LocalDate birthDate,
            ApplicantGender gender,
            String locality,
            MultipartFile cv,
            String clientIp) {

        rateLimiter.check(clientIp);

        JobOffer offer = jobOfferRepository.findByIdAndState(jobOfferId, State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("Offre introuvable"));
        if (offer.getStatus() != JobOfferStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Offre introuvable");
        }

        validateApplicant(firstName, lastName, phone, birthDate, gender, locality);
        validateCv(cv);

        JobApplication application = new JobApplication();
        application.setJobOfferId(jobOfferId);
        application.setFirstName(firstName.trim());
        application.setLastName(lastName.trim());
        application.setPhone(RecruitmentPhoneNormalizer.normalize(phone));
        application.setEmail(StringUtils.hasText(email) ? email.trim() : null);
        application.setBirthDate(birthDate);
        application.setGender(gender);
        application.setLocality(locality.trim());
        application.setSubmittedAt(LocalDateTime.now());
        application.setCreatedBy("PublicSite");

        application = jobApplicationRepository.save(application);

        try {
            byte[] cvBytes = cv.getBytes();
            String contentType = cv.getContentType();
            recruitmentStoragePort.storeApplicationCv(application.getId(), cvBytes, contentType, cv.getOriginalFilename());
            application.setCvBucket(recruitmentProperties.getBucket());
            application.setCvKey(RecruitmentObjectKeyBuilder.applicationCvKey(
                    application.getId(),
                    RecruitmentObjectKeyBuilder.extensionFromContentType(contentType)));
            application.setCvContentType(contentType);
            application.setCvFileName(cv.getOriginalFilename());
            jobApplicationRepository.save(application);
        } catch (IOException e) {
            throw new ApplicationException("Impossible de lire le fichier CV");
        }

        return application.getId();
    }

    private void validateApplicant(
            String firstName,
            String lastName,
            String phone,
            LocalDate birthDate,
            ApplicantGender gender,
            String locality) {
        if (!StringUtils.hasText(firstName) || !StringUtils.hasText(lastName)) {
            throw new ApplicationException("Le nom et le prénom sont obligatoires");
        }
        if (!StringUtils.hasText(phone) || RecruitmentPhoneNormalizer.normalize(phone).length() < 8) {
            throw new ApplicationException("Numéro de téléphone invalide");
        }
        if (birthDate == null) {
            throw new ApplicationException("La date de naissance est obligatoire");
        }
        if (Period.between(birthDate, LocalDate.now()).getYears() < 18) {
            throw new ApplicationException("Vous devez avoir au moins 18 ans pour postuler");
        }
        if (gender == null) {
            throw new ApplicationException("Le sexe est obligatoire");
        }
        if (!StringUtils.hasText(locality)) {
            throw new ApplicationException("La localité est obligatoire");
        }
    }

    private void validateCv(MultipartFile cv) {
        if (cv == null || cv.isEmpty()) {
            throw new ApplicationException("Le CV est obligatoire");
        }
        String contentType = cv.getContentType();
        if (contentType == null || !ALLOWED_CV_TYPES.contains(contentType.toLowerCase())) {
            throw new ApplicationException("Format de CV non accepté (PDF, JPG, JPEG ou PNG uniquement)");
        }
        if (cv.getSize() > recruitmentProperties.getMaxCvBytes()) {
            throw new ApplicationException("Le CV ne doit pas dépasser 5 Mo");
        }
    }
}
