package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.elykia.sale.domain.DebtAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DebtAllocationRepository extends JpaRepository<DebtAllocation, Long> {
}
