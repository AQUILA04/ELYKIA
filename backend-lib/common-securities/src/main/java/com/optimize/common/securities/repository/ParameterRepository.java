package com.optimize.common.securities.repository;

import com.optimize.common.securities.models.Parameter;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ParameterRepository extends JpaRepository<Parameter, Long> {
    Optional<Parameter> findByKey(String key);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Parameter p WHERE p.key = :key")
    Optional<Parameter> findByKeyForUpdate(@Param("key") String key);
}
