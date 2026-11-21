package com.optimize.common.securities.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAccountRepository extends GenericRepository<UserAccount, Long> {

    Optional<UserAccount> findByUsername(String username);

    Boolean existsByUsername(String username);

}
