package com.optimize.common.securities.repository;

import java.util.List;
import java.util.Optional;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.common.securities.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends GenericRepository<User, Long> {

  Boolean existsByEmail(String email);

  Optional<User> findByUserAccount_username(String username);

    Optional<User> findByUserAccount_usernameIgnoreCase(String username);

  Boolean existsByUserAccount_username(String username);

    Boolean existsByUserAccount_usernameIgnoreCase(String username);

  Optional<User> findByEmail(String email);

  List<User> findByUserAccount_userProfil_name(String profilName);
}
