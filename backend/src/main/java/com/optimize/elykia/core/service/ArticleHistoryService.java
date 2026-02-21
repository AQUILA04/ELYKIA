package com.optimize.elykia.core.service;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.ArticleHistoryDto;
import com.optimize.elykia.core.entity.ArticleHistory;
import com.optimize.elykia.core.repository.ArticleHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ArticleHistoryService extends GenericService<ArticleHistory, Long> {

    protected ArticleHistoryService(ArticleHistoryRepository repository) {
        super(repository);
    }

    public List<ArticleHistoryDto> getByArticleId(Long articleId) {
        return ((ArticleHistoryRepository) getRepository())
                .findByArticles_IdOrderByOperationDateDesc(articleId)
                .stream()
                .map(h -> ArticleHistoryDto.builder()
                        .id(h.getId())
                        .operationType(h.getOperationType())
                        .initialQuantity(h.getInitialQuantity())
                        .operationQuantity(h.getOperationQuantity())
                        .finalQuantity(h.getFinalQuantity())
                        .operationDate(h.getOperationDate())
                        .operationUser(h.getOperationUser())
                        .build())
                .collect(Collectors.toList());
    }
}
