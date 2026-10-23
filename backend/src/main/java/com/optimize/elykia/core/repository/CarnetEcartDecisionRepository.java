package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.carnet.CarnetEcartDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CarnetEcartDecisionRepository extends JpaRepository<CarnetEcartDecision, Long> {

    List<CarnetEcartDecision> findByCreditFieldControlIdIn(Collection<Long> controlIds);

    List<CarnetEcartDecision> findByTontineLineIdIn(Collection<Long> lineIds);

    Optional<CarnetEcartDecision> findByCreditFieldControlId(Long creditFieldControlId);

    Optional<CarnetEcartDecision> findByTontineLineId(Long tontineLineId);
}
