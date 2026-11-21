package com.optimize.elykia.core.controller;

import tools.jackson.databind.ObjectMapper;
import com.optimize.elykia.inventory.web.dto.ArticlesDto;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.sale.application.CreditArticlesService;
import com.optimize.elykia.inventory.application.ArticlesService;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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

    @MockitoBean
    private ArticlesService articlesService;

    @MockitoBean
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
        when(articlesService.getReadableArticle(1L)).thenReturn(article);

        mockMvc.perform(get("/api/v1/articles/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Article 1"));
    }
}
