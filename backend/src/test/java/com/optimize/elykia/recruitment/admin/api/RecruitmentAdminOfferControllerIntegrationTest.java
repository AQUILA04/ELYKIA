package com.optimize.elykia.recruitment.admin.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.optimize.elykia.recruitment.admin.api.dto.JobOfferAdminDto;
import com.optimize.elykia.recruitment.admin.api.dto.JobOfferUpsertDto;
import com.optimize.elykia.recruitment.admin.application.ManageJobOfferUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RecruitmentAdminOfferControllerIntegrationTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private ManageJobOfferUseCase manageJobOfferUseCase;

    @InjectMocks
    private RecruitmentAdminOfferController recruitmentAdminOfferController;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        mockMvc = MockMvcBuilders.standaloneSetup(recruitmentAdminOfferController)
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void createOfferWithMultipartReturnsCreated() throws Exception {
        JobOfferAdminDto created = JobOfferAdminDto.builder()
                .id(1L)
                .title("Aide commerciale")
                .build();
        when(manageJobOfferUseCase.create(any(JobOfferUpsertDto.class), isNull())).thenReturn(created);

        JobOfferUpsertDto dto = new JobOfferUpsertDto();
        dto.setTitle("Aide commerciale");
        dto.setDescription("Description");
        dto.setDisplayOrder(0);

        MockMultipartFile offerPart = new MockMultipartFile(
                "offer",
                "offer.json",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(dto));

        mockMvc.perform(multipart("/api/v1/recruitment/offers")
                        .file(offerPart)
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("Aide commerciale"));
    }
}
