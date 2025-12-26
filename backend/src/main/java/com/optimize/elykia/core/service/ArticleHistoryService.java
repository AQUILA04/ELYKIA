package com.optimize.elykia.core.service;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.ArticleHistory;
import com.optimize.elykia.core.repository.ArticleHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ArticleHistoryService extends GenericService<ArticleHistory, Long> {

    protected ArticleHistoryService(ArticleHistoryRepository repository) {
        super(repository);
    }
}
