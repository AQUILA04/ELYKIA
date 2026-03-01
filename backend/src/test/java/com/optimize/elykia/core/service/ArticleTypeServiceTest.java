package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.ArticleTypeDto;
import com.optimize.elykia.core.entity.ArticleType;
import com.optimize.elykia.core.mapper.ArticleTypeMapper;
import com.optimize.elykia.core.repository.ArticleTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleTypeServiceTest {

    @Mock
    private ArticleTypeRepository articleTypeRepository;

    @Mock
    private ArticleTypeMapper articleTypeMapper;

    @InjectMocks
    private ArticleTypeService articleTypeService;

    private ArticleType articleType;
    private ArticleTypeDto articleTypeDto;

    @BeforeEach
    void setUp() {
        articleType = new ArticleType();
        articleType.setId(1L);
        articleType.setName("Electronics");

        articleTypeDto = new ArticleTypeDto();
        articleTypeDto.setId(1L);
        articleTypeDto.setName("Electronics");
    }

    @Test
    void createArticleType_ShouldReturnCreatedArticleType() {
        when(articleTypeMapper.toEntity(articleTypeDto)).thenReturn(articleType);
        when(articleTypeRepository.save(any(ArticleType.class))).thenReturn(articleType);

        ArticleType result = articleTypeService.createArticleType(articleTypeDto);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Electronics");
        verify(articleTypeRepository, times(1)).save(any(ArticleType.class));
    }

    @Test
    void updateArticleType_ShouldReturnUpdatedArticleType() {
        when(articleTypeMapper.toEntity(articleTypeDto)).thenReturn(articleType);
        when(articleTypeRepository.saveAndFlush(any(ArticleType.class))).thenReturn(articleType);

        ArticleType result = articleTypeService.updateArticleType(articleTypeDto, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(articleTypeRepository, times(1)).saveAndFlush(any(ArticleType.class));
    }
}
