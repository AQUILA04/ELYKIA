package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.agency.Agency;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AgencyRepository extends GenericRepository<Agency, Long> {

    boolean existsByCodeAndActiveTrue(String code);

    List<Agency> findAllByActiveTrue();

    Optional<Agency> findByCode(String code);

    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM Agency a "
            + "WHERE a.code = :code AND a.active = true AND a.id <> :id")
    boolean existsByCodeAndActiveTrueAndIdNot(@Param("code") String code, @Param("id") Long id);
}
