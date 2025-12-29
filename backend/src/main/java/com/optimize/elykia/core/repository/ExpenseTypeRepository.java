package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.ExpenseType;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpenseTypeRepository extends GenericRepository<ExpenseType, Long> {
    java.util.Optional<ExpenseType> findByName(String name);
}
