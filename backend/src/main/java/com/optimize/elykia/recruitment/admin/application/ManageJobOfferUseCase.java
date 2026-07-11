package com.optimize.elykia.recruitment.admin.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.recruitment.RecruitmentProperties;
import com.optimize.elykia.recruitment.admin.api.dto.JobOfferAdminDto;
import com.optimize.elykia.recruitment.admin.api.dto.JobOfferUpsertDto;
import com.optimize.elykia.recruitment.shared.domain.JobOffer;
import com.optimize.elykia.recruitment.shared.domain.JobOfferStatus;
import com.optimize.elykia.recruitment.shared.infrastructure.persistence.JobOfferRepository;
import com.optimize.elykia.recruitment.shared.infrastructure.storage.RecruitmentStoragePort;
import com.optimize.elykia.recruitment.shared.mapper.RecruitmentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ManageJobOfferUseCase {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp");

    private final JobOfferRepository jobOfferRepository;
    private final RecruitmentMapper recruitmentMapper;
    private final RecruitmentStoragePort recruitmentStoragePort;
    private final RecruitmentProperties recruitmentProperties;

    public Page<JobOfferAdminDto> list(Pageable pageable) {
        return jobOfferRepository.findByStateNot(State.DELETED, pageable)
                .map(recruitmentMapper::toAdminDto);
    }

    public JobOfferAdminDto getById(Long id) {
        return recruitmentMapper.toAdminDto(findOffer(id));
    }

    @Transactional
    public JobOfferAdminDto create(JobOfferUpsertDto dto, MultipartFile image) {
        JobOffer offer = new JobOffer();
        applyUpsert(offer, dto);
        offer.setStatus(JobOfferStatus.DRAFT);
        offer = jobOfferRepository.save(offer);
        storeImageIfPresent(offer, image);
        return recruitmentMapper.toAdminDto(jobOfferRepository.save(offer));
    }

    @Transactional
    public JobOfferAdminDto update(Long id, JobOfferUpsertDto dto, MultipartFile image) {
        JobOffer offer = findOffer(id);
        applyUpsert(offer, dto);
        if (image != null && !image.isEmpty()) {
            recruitmentStoragePort.deleteOfferImage(offer.getImageBucket(), offer.getImageKey());
            storeImageIfPresent(offer, image);
        }
        return recruitmentMapper.toAdminDto(jobOfferRepository.save(offer));
    }

    @Transactional
    public JobOfferAdminDto publish(Long id) {
        JobOffer offer = findOffer(id);
        if (offer.getStatus() == JobOfferStatus.PUBLISHED) {
            return recruitmentMapper.toAdminDto(offer);
        }
        offer.setStatus(JobOfferStatus.PUBLISHED);
        offer.setPublishedAt(LocalDateTime.now());
        offer.setWithdrawnAt(null);
        return recruitmentMapper.toAdminDto(jobOfferRepository.save(offer));
    }

    @Transactional
    public JobOfferAdminDto withdraw(Long id) {
        JobOffer offer = findOffer(id);
        offer.setStatus(JobOfferStatus.WITHDRAWN);
        offer.setWithdrawnAt(LocalDateTime.now());
        return recruitmentMapper.toAdminDto(jobOfferRepository.save(offer));
    }

    @Transactional
    public void delete(Long id) {
        JobOffer offer = findOffer(id);
        offer.setState(State.DELETED);
        jobOfferRepository.save(offer);
    }

    private JobOffer findOffer(Long id) {
        return jobOfferRepository.findByIdAndState(id, State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("Offre introuvable"));
    }

    private void applyUpsert(JobOffer offer, JobOfferUpsertDto dto) {
        offer.setTitle(dto.getTitle().trim());
        offer.setDescription(dto.getDescription());
        offer.setHighlights(dto.getHighlights() != null ? dto.getHighlights() : List.of());
        offer.setDisplayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0);
    }

    private void storeImageIfPresent(JobOffer offer, MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return;
        }
        String contentType = image.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new ApplicationException("Format d'image non accepté (JPEG, PNG ou WebP)");
        }
        if (image.getSize() > recruitmentProperties.getMaxOfferImageBytes()) {
            throw new ApplicationException("L'image ne doit pas dépasser 2 Mo");
        }
        try {
            RecruitmentStoragePort.StoredOfferImage stored = recruitmentStoragePort.storeOfferImage(
                    offer.getId(), image.getBytes(), contentType);
            offer.setImageBucket(stored.bucket());
            offer.setImageKey(stored.key());
            offer.setImageUrl(stored.publicUrl());
        } catch (IOException e) {
            throw new ApplicationException("Impossible de lire l'image");
        }
    }
}
