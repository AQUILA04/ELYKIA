package com.optimize.elykia.finance.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.finance.domain.ExpenseType;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpenseTypeRepository extends GenericRepository<ExpenseType, Long> {
    java.util.Optional<ExpenseType> findByName(String name);
}
