package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.CreditArticleDetailDto;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CreditArticlesService extends GenericService<CreditArticles, Long> {

    protected CreditArticlesService(CreditArticlesRepository repository) {
        super(repository);
    }

    public void delete(CreditArticles creditArticles) {
        getRepository().delete(creditArticles);
    }

    @Override
    public CreditArticlesRepository getRepository() {
        return (CreditArticlesRepository) super.getRepository();
    }

    public List<Object[]> getTop10ArticlesWithHighestQuantity() {
        Pageable top10 = PageRequest.of(0, 10);
        return getRepository().findTop10ArticlesWithHighestQuantity(top10);
    }

    public List<CreditArticleDetailDto> getDetailsByStockItemId(Long stockItemId) {
        return getRepository().findDetailsByStockItemId(stockItemId);
    }
}
