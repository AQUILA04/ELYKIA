package com.optimize.elykia.core.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.service.sale.CreditArticlesService;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.support.IntegrationTestSupport;
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
class ArticlesControllerIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ArticlesService articlesService;

    @MockBean
    private CreditArticlesService creditArticlesService;

    @Autowired
    private ObjectMapper objectMapper;

    private ArticlesDto articlesDto;
    private Articles article;

    @BeforeEach
    void setUp() {
        articlesDto = new ArticlesDto();
        articlesDto.setName("Article 1");
        articlesDto.setPurchasePrice(100.0);
        articlesDto.setSellingPrice(130.0);
        articlesDto.setCreditSalePrice(150.0);
        articlesDto.setMarque("Elykia");
        articlesDto.setModel("M-100");
        articlesDto.setType("ELECTRONIQUE");
        articlesDto.setStockQuantity(10);

        article = new Articles();
        article.setId(1L);
        article.setName("Article 1");
        article.setPurchasePrice(100.0);
        article.setSellingPrice(130.0);
        article.setCreditSalePrice(150.0);
        article.setMarque("Elykia");
        article.setModel("M-100");
        article.setType("ELECTRONIQUE");
        article.setStockQuantity(10);
    }

    @Test
    void createArticle_ShouldReturnCreated() throws Exception {
        when(articlesService.createArticles(any(ArticlesDto.class))).thenReturn(article);

        mockMvc.perform(post("/api/v1/articles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(articlesDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Article 1"));
    }

    @Test
    void updateArticle_ShouldReturnOk() throws Exception {
        when(articlesService.updateArticles(any(ArticlesDto.class), eq(1L))).thenReturn(article);

        mockMvc.perform(put("/api/v1/articles/{id}", 1L)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(articlesDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Article 1"));
    }

    @Test
    void getArticle_ShouldReturnOk() throws Exception {
        when(articlesService.getById(1L)).thenReturn(article);

        mockMvc.perform(get("/api/v1/articles/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Article 1"));
    }
}
