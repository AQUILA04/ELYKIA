package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TontineStockRepository extends GenericRepository<TontineStock, Long> {
    Optional<TontineStock> findByArticleIdAndCommercialAndYear(Long articleId, String commercial, Integer year);

    List<TontineStock> findByCommercialAndYear(String commercial, Integer year);
    
    Page<TontineStock> findByCommercial(String commercial, Pageable pageable);

    // Pour l'année courante - Trié par commercial pour un affichage groupé cohérent
    Page<TontineStock> findByCommercialAndYearOrderByCommercialAsc(String commercial, Integer year, Pageable pageable);
    
    // Pour l'historique (tout sauf année courante) - Trié par commercial et année
    Page<TontineStock> findByCommercialAndYearNotOrderByYearDesc(String commercial, Integer year, Pageable pageable);

    // Pour admin/manager sans filtre commercial - Trié par commercial
    Page<TontineStock> findByYearOrderByCommercialAsc(Integer year, Pageable pageable);
    
    // Pour admin/manager historique sans filtre - Trié par commercial et année
    Page<TontineStock> findByYearNotOrderByCommercialAscYearDesc(Integer year, Pageable pageable);

    default TontineStock getArticleForCommercial(Long articleId, String commercial) {
        return findByArticleIdAndCommercialAndYear(articleId, commercial, LocalDate.now().getYear()).orElse(null);
    }
}
