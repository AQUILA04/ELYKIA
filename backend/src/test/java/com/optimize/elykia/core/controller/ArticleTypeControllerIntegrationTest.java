package com.optimize.elykia.core.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.elykia.core.dto.ArticleTypeDto;
import com.optimize.elykia.core.entity.ArticleType;
import com.optimize.elykia.core.service.ArticleTypeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false) // Disable security filters for simplicity
class ArticleTypeControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ArticleTypeService articleTypeService;

    @Autowired
    private ObjectMapper objectMapper;

    private ArticleTypeDto articleTypeDto;
    private ArticleType articleType;

    @BeforeEach
    void setUp() {
        articleTypeDto = new ArticleTypeDto();
        articleTypeDto.setId(1L);
        articleTypeDto.setName("Electronics");

        articleType = new ArticleType();
        articleType.setId(1L);
        articleType.setName("Electronics");
    }

    @Test
    void createArticleType_ShouldReturnCreated() throws Exception {
        when(articleTypeService.createArticleType(any(ArticleTypeDto.class))).thenReturn(articleType);

        mockMvc.perform(post("/api/v1/article-types")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(articleTypeDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Electronics"));
    }

    @Test
    void updateArticleType_ShouldReturnOk() throws Exception {
        when(articleTypeService.updateArticleType(any(ArticleTypeDto.class), eq(1L))).thenReturn(articleType);

        mockMvc.perform(put("/api/v1/article-types/{id}", 1L)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(articleTypeDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Electronics"));
    }

    @Test
    void getArticleType_ShouldReturnOk() throws Exception {
        when(articleTypeService.getById(1L)).thenReturn(articleType);

        mockMvc.perform(get("/api/v1/article-types/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Electronics"));
    }
}
