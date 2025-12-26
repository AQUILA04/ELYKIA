package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.TontineStock;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TontineStockRepository extends GenericRepository<TontineStock, Long> {
    Optional<TontineStock> findByArticleIdAndCommercialAndYear(Long articleId, String commercial, Integer year);

    List<TontineStock> findByCommercialAndYear(String commercial, Integer year);

    default TontineStock getArticleForCommercial(Long articleId, String commercial) {
        return findByArticleIdAndCommercialAndYear(articleId, commercial, LocalDate.now().getYear()).orElse(null);
    }
}
