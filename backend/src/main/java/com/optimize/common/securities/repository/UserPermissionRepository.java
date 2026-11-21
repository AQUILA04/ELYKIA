package com.optimize.common.securities.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.common.securities.models.UserPermission;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPermissionRepository extends GenericRepository<UserPermission, Long> {

    boolean existsByName(String name);

    Optional<UserPermission> findByName(String name);
}
