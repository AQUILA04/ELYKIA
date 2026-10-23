package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.ArticleTypeDto;
import com.optimize.elykia.core.entity.article.ArticleType;
import com.optimize.elykia.core.mapper.ArticleTypeMapper;
import com.optimize.elykia.core.repository.ArticleTypeRepository;
import com.optimize.elykia.core.service.store.ArticleTypeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
        ArticleType existing = new ArticleType();
        existing.setId(1L);
        existing.setPhotoObjectKey("article-types/1.jpg");
        when(articleTypeRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(articleTypeMapper.toEntity(articleTypeDto)).thenReturn(articleType);
        when(articleTypeRepository.saveAndFlush(any(ArticleType.class))).thenReturn(articleType);

        ArticleType result = articleTypeService.updateArticleType(articleTypeDto, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(articleType.getPhotoObjectKey()).isEqualTo("article-types/1.jpg");
        verify(articleTypeRepository, times(1)).saveAndFlush(any(ArticleType.class));
    }

    @Test
    void list_ShouldSearchEnabledTypesByTrimmedTerm() {
        Pageable pageable = PageRequest.of(0, 10);
        when(articleTypeRepository.searchEnabled("elec", pageable)).thenReturn(Page.empty());

        Page<ArticleType> result = articleTypeService.list("  elec  ", pageable);

        assertThat(result.getContent()).isEmpty();
        verify(articleTypeRepository).searchEnabled("elec", pageable);
    }

    @Test
    void list_BlankSearchShouldReturnEnabledPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(articleTypeRepository.findByState(com.optimize.common.entities.enums.State.ENABLED, pageable))
                .thenReturn(Page.empty());

        articleTypeService.list("   ", pageable);

        verify(articleTypeRepository).findByState(com.optimize.common.entities.enums.State.ENABLED, pageable);
        verify(articleTypeRepository, never()).searchEnabled(any(), any());
    }
}
