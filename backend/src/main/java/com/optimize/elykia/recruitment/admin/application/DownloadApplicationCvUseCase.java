package com.optimize.elykia.recruitment.admin.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.recruitment.shared.domain.JobApplication;
import com.optimize.elykia.recruitment.shared.infrastructure.persistence.JobApplicationRepository;
import com.optimize.elykia.recruitment.shared.infrastructure.storage.RecruitmentStoragePort;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DownloadApplicationCvUseCase {

    private final JobApplicationRepository jobApplicationRepository;
    private final RecruitmentStoragePort recruitmentStoragePort;

    public CvDownload execute(Long applicationId) {
        JobApplication application = jobApplicationRepository.findById(applicationId)
                .filter(a -> a.getState() != State.DELETED)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature introuvable"));
        if (!StringUtils.hasText(application.getCvBucket()) || !StringUtils.hasText(application.getCvKey())) {
            throw new ApplicationException("Aucun CV enregistré pour cette candidature");
        }
        String fileName = StringUtils.hasText(application.getCvFileName())
                ? application.getCvFileName()
                : "cv-" + applicationId;
        String contentType = StringUtils.hasText(application.getCvContentType())
                ? application.getCvContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        Resource resource = new InputStreamResource(
                recruitmentStoragePort.openCvStream(application.getCvBucket(), application.getCvKey()));
        return new CvDownload(resource, fileName, contentType);
    }

    public record CvDownload(Resource resource, String fileName, String contentType) {
    }
}
