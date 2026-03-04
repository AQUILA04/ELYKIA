package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.CreditReturnHistory;
import com.optimize.elykia.core.repository.CreditReturnHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CreditReturnHistoryService extends GenericService<CreditReturnHistory, Long> {

    private final CreditReturnHistoryRepository creditReturnHistoryRepository;
    
    protected CreditReturnHistoryService(CreditReturnHistoryRepository repository) {
        super(repository);
        this.creditReturnHistoryRepository = repository;
    }
    
    public List<CreditReturnHistory> getHistoryByCreditId(Long creditId) {
        return creditReturnHistoryRepository.findByCreditId(creditId);
    }
    
    public List<CreditReturnHistory> getHistoryByArticleId(Long articleId) {
        return creditReturnHistoryRepository.findByArticleId(articleId);
    }
}