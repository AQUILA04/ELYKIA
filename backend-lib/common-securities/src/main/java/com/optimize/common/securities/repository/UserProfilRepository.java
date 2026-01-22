package com.optimize.common.securities.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.common.securities.models.UserProfil;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserProfilRepository extends GenericRepository<UserProfil, Long> {
    Boolean existsByName(String name);

    Optional<UserProfil> findByName(String name);
}
