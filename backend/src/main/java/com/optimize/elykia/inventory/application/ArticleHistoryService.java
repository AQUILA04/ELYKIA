package com.optimize.elykia.inventory.application;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.inventory.web.dto.ArticleHistoryDto;
import com.optimize.elykia.inventory.domain.ArticleHistory;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticleHistoryRepository;
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
                .findByArticles_IdOrderByIdDesc(articleId)
                .stream()
                .map(h -> ArticleHistoryDto.builder()
                        .id(h.getId())
                        .operationType(h.getOperationType())
                        .initialQuantity(h.getInitialQuantity())
                        .operationQuantity(h.getOperationQuantity())
                        .finalQuantity(h.getFinalQuantity())
                        .operationDate(h.getOperationDate())
                        .operationUser(h.getOperationUser())
                        .beneficiary(h.getBeneficiary())
                        .referenceType(h.getReferenceType())
                        .referenceId(h.getReferenceId())
                        .referenceLabel(h.getReferenceLabel())
                        .build())
                .collect(Collectors.toList());
    }
}
