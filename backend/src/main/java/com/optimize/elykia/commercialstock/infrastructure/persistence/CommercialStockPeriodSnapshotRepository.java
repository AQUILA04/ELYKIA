package com.optimize.elykia.commercialstock.infrastructure.persistence;

import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.domain.CommercialStockPeriodSnapshot;
import com.optimize.elykia.commercialstock.domain.SnapshotPeriodGrain;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommercialStockPeriodSnapshotRepository extends JpaRepository<CommercialStockPeriodSnapshot, Long> {

    Optional<CommercialStockPeriodSnapshot> findByCollectorAndArticleIdAndActivityTypeAndPeriodGrainAndPeriodYearAndPeriodMonth(
            String collector, Long articleId, StockActivityType activityType, SnapshotPeriodGrain grain,
            Integer year, Integer month);
}
