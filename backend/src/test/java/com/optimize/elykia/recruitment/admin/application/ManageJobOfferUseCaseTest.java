package com.optimize.elykia.recruitment.admin.application;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.recruitment.RecruitmentProperties;
import com.optimize.elykia.recruitment.admin.api.dto.JobOfferUpsertDto;
import com.optimize.elykia.recruitment.shared.domain.JobOffer;
import com.optimize.elykia.recruitment.shared.domain.JobOfferStatus;
import com.optimize.elykia.recruitment.shared.infrastructure.persistence.JobOfferRepository;
import com.optimize.elykia.recruitment.shared.infrastructure.storage.RecruitmentStoragePort;
import com.optimize.elykia.recruitment.shared.mapper.RecruitmentMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ManageJobOfferUseCaseTest {

    @Mock
    private JobOfferRepository jobOfferRepository;
    @Mock
    private RecruitmentMapper recruitmentMapper;
    @Mock
    private RecruitmentStoragePort recruitmentStoragePort;
    @Mock
    private RecruitmentProperties recruitmentProperties;

    @InjectMocks
    private ManageJobOfferUseCase manageJobOfferUseCase;

    @Test
    void publishSetsStatusAndTimestamp() {
        JobOffer offer = new JobOffer();
        offer.setId(1L);
        offer.setStatus(JobOfferStatus.DRAFT);
        when(jobOfferRepository.findByIdAndState(1L, State.ENABLED)).thenReturn(Optional.of(offer));
        when(jobOfferRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(recruitmentMapper.toAdminDto(any())).thenReturn(null);

        manageJobOfferUseCase.publish(1L);

        assertEquals(JobOfferStatus.PUBLISHED, offer.getStatus());
        verify(jobOfferRepository).save(offer);
    }
}
