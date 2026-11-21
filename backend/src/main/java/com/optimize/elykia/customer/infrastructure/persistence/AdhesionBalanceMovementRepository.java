package com.optimize.elykia.customer.infrastructure.persistence;

import com.optimize.elykia.customer.domain.AdhesionBalanceMovement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdhesionBalanceMovementRepository extends JpaRepository<AdhesionBalanceMovement, Long> {
}
