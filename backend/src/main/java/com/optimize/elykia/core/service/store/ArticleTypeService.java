package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.ArticleTypeDto;
import com.optimize.elykia.core.entity.ArticleType;
import com.optimize.elykia.core.mapper.ArticleTypeMapper;
import com.optimize.elykia.core.repository.ArticleTypeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@Slf4j
public class ArticleTypeService extends GenericService<ArticleType, Long> {

    private final ArticleTypeMapper articleTypeMapper;

    protected ArticleTypeService(ArticleTypeRepository repository, ArticleTypeMapper articleTypeMapper) {
        super(repository);
        this.articleTypeMapper = articleTypeMapper;
    }

    @Transactional
    public ArticleType createArticleType(ArticleTypeDto dto) {
        log.info("Creating new article type: {}", dto.getName());
        ArticleType articleType = articleTypeMapper.toEntity(dto);
        return create(articleType);
    }

    @Transactional
    public ArticleType updateArticleType(ArticleTypeDto dto, Long id) {
        log.info("Updating article type with id: {}", id);
        dto.setId(id);
        ArticleType articleType = articleTypeMapper.toEntity(dto);
        return update(articleType);
    }

    @Override
    public ArticleTypeRepository getRepository() {
        return (ArticleTypeRepository) super.getRepository();
    }
}
