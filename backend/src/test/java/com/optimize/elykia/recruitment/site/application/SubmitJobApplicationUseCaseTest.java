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
import com.optimize.elykia.recruitment.shared.infrastructure.storage.RecruitmentStoragePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SubmitJobApplicationUseCaseTest {

    @Mock
    private JobOfferRepository jobOfferRepository;
    @Mock
    private JobApplicationRepository jobApplicationRepository;
    @Mock
    private RecruitmentStoragePort recruitmentStoragePort;
    @Mock
    private RecruitmentProperties recruitmentProperties;
    @Mock
    private RecruitmentApplicationRateLimiter rateLimiter;

    @InjectMocks
    private SubmitJobApplicationUseCase submitJobApplicationUseCase;

    private JobOffer publishedOffer;
    private MockMultipartFile cv;

    @BeforeEach
    void setUp() {
        publishedOffer = new JobOffer();
        publishedOffer.setId(10L);
        publishedOffer.setStatus(JobOfferStatus.PUBLISHED);

        cv = new MockMultipartFile(
                "cv",
                "cv.pdf",
                "application/pdf",
                new byte[]{1, 2, 3});

        when(recruitmentProperties.getBucket()).thenReturn("elykia-recruitment");
        when(recruitmentProperties.getMaxCvBytes()).thenReturn(5L * 1024 * 1024);
        doNothing().when(rateLimiter).check(any());
    }

    @Test
    void executeStoresApplicationAndCv() throws Exception {
        when(jobOfferRepository.findByIdAndState(10L, State.ENABLED)).thenReturn(Optional.of(publishedOffer));
        when(jobApplicationRepository.save(any())).thenAnswer(inv -> {
            JobApplication app = inv.getArgument(0);
            if (app.getId() == null) {
                app.setId(99L);
            }
            return app;
        });
        doNothing().when(recruitmentStoragePort).storeApplicationCv(anyLong(), any(), any(), any());

        Long id = submitJobApplicationUseCase.execute(
                10L,
                "Ama",
                "Koffi",
                "+22890123456",
                "ama@example.com",
                LocalDate.of(1995, 5, 15),
                ApplicantGender.FEMALE,
                "Lomé",
                cv,
                "127.0.0.1");

        assertEquals(99L, id);
        ArgumentCaptor<JobApplication> captor = ArgumentCaptor.forClass(JobApplication.class);
        verify(jobApplicationRepository, times(2)).save(captor.capture());
        assertEquals("90123456", captor.getAllValues().get(0).getPhone());
        verify(recruitmentStoragePort).storeApplicationCv(eq(99L), any(), eq("application/pdf"), eq("cv.pdf"));
    }

    @Test
    void executeRejectsDraftOffer() {
        JobOffer draft = new JobOffer();
        draft.setId(10L);
        draft.setStatus(JobOfferStatus.DRAFT);
        when(jobOfferRepository.findByIdAndState(10L, State.ENABLED)).thenReturn(Optional.of(draft));

        assertThrows(ResourceNotFoundException.class, () -> submitJobApplicationUseCase.execute(
                10L, "Ama", "Koffi", "+22890123456", null,
                LocalDate.of(1995, 5, 15), ApplicantGender.FEMALE, "Lomé", cv, "127.0.0.1"));
    }

    @Test
    void executeRejectsApplicantUnder18() {
        when(jobOfferRepository.findByIdAndState(10L, State.ENABLED)).thenReturn(Optional.of(publishedOffer));

        assertThrows(ApplicationException.class, () -> submitJobApplicationUseCase.execute(
                10L, "Ama", "Koffi", "+22890123456", null,
                LocalDate.now().minusYears(17), ApplicantGender.FEMALE, "Lomé", cv, "127.0.0.1"));
    }

    @Test
    void executeRejectsUnsupportedCvType() {
        when(jobOfferRepository.findByIdAndState(10L, State.ENABLED)).thenReturn(Optional.of(publishedOffer));
        MockMultipartFile doc = new MockMultipartFile("cv", "cv.doc", "application/msword", new byte[]{1});

        assertThrows(ApplicationException.class, () -> submitJobApplicationUseCase.execute(
                10L, "Ama", "Koffi", "+22890123456", null,
                LocalDate.of(1995, 5, 15), ApplicantGender.FEMALE, "Lomé", doc, "127.0.0.1"));
    }
}
