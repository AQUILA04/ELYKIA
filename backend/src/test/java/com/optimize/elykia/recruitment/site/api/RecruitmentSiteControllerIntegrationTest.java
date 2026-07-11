package com.optimize.elykia.recruitment.site.api;

import com.optimize.elykia.recruitment.shared.domain.ApplicantGender;
import com.optimize.elykia.recruitment.site.api.dto.PublishedJobOfferResponse;
import com.optimize.elykia.recruitment.site.application.GetPublishedOfferUseCase;
import com.optimize.elykia.recruitment.site.application.ListPublishedOffersUseCase;
import com.optimize.elykia.recruitment.site.application.SubmitJobApplicationUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RecruitmentSiteControllerIntegrationTest {

    private MockMvc mockMvc;

    @Mock
    private ListPublishedOffersUseCase listPublishedOffersUseCase;
    @Mock
    private GetPublishedOfferUseCase getPublishedOfferUseCase;
    @Mock
    private SubmitJobApplicationUseCase submitJobApplicationUseCase;

    @InjectMocks
    private RecruitmentSiteController recruitmentSiteController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(recruitmentSiteController).build();
    }

    @Test
    void listOffersReturnsPublishedOffers() throws Exception {
        PublishedJobOfferResponse offer = PublishedJobOfferResponse.builder()
                .id(1L)
                .title("Aide commerciale")
                .build();
        when(listPublishedOffersUseCase.execute()).thenReturn(List.of(offer));

        mockMvc.perform(get("/api/public/recruitment/offers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Aide commerciale"));
    }

    @Test
    void submitApplicationReturnsCreated() throws Exception {
        when(submitJobApplicationUseCase.execute(
                eq(1L), eq("Ama"), eq("Koffi"), eq("+22890123456"), eq(null),
                eq(LocalDate.of(1995, 5, 15)), eq(ApplicantGender.FEMALE), eq("Lomé"),
                any(), any())).thenReturn(42L);

        MockMultipartFile cv = new MockMultipartFile(
                "cv", "cv.pdf", "application/pdf", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/public/recruitment/applications")
                        .file(cv)
                        .param("jobOfferId", "1")
                        .param("firstName", "Ama")
                        .param("lastName", "Koffi")
                        .param("phone", "+22890123456")
                        .param("birthDate", "1995-05-15")
                        .param("gender", "FEMALE")
                        .param("locality", "Lomé")
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.applicationId").value(42));
    }
}
