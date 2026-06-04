package com.optimize.common.securities.repository;

import java.util.List;
import java.util.Optional;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

@Repository
public interface UserRepository extends GenericRepository<User, Long> {

  Boolean existsByEmail(String email);

  Optional<User> findByUserAccount_username(String username);

    Optional<User> findByUserAccount_usernameIgnoreCase(String username);

  Boolean existsByUserAccount_username(String username);

  Boolean existsByUserAccount_usernameIgnoreCase(String username);

  Boolean existsByStateAndUserAccount_usernameIgnoreCaseAndUserAccount_activeIsTrue(State state, String username);

  Optional<User> findByEmail(String email);

  List<User> findByUserAccount_userProfil_name(String profilName);
  List<User> findByUserAccount_userProfil_nameAndUserAccount_activeIsTrueOrderByUserAccount_username(String profilName);

  default Page<User> search(String keyword, Pageable pageable) {
    return findAll(getSearchSpecification(keyword), pageable);
  }

  default Specification<User> getSearchSpecification(String keyword) {
    final String searchKeyword = String.format("%%%s%%", keyword.toLowerCase());
    return (root, query, cb) -> {
      Join<User, UserAccount> accountJoin = root.join("userAccount", JoinType.LEFT);
      Predicate textMatch = cb.or(
          cb.like(cb.lower(root.get("firstname")), searchKeyword),
          cb.like(cb.lower(root.get("lastname")), searchKeyword),
          cb.like(cb.lower(root.get("email")), searchKeyword),
          cb.like(cb.lower(root.get("phone")), searchKeyword),
          cb.like(cb.lower(accountJoin.get("username")), searchKeyword));
      Predicate notDeleted = cb.notEqual(root.get("state"), State.DELETED);
      return cb.and(textMatch, notDeleted);
    };
  }
}
