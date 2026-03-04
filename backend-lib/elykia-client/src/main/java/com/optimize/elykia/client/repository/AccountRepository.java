package com.optimize.elykia.client.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.client.dto.AccountRespDto;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;


public interface AccountRepository extends GenericRepository<Account, Long> {

    default Page<Account> elasticsearch(String keyword, Pageable pageable) {
        return findAll(getElasticsearchCriteria(keyword), pageable);
    }

    default Specification<Account> getElasticsearchCriteria(String keyword) {
        final String searchKeyword = String.format("%%%s%%", keyword.toLowerCase());

        return (root, query, cb) -> {
            jakarta.persistence.criteria.Predicate p = cb.or(
                    cb.like(cb.lower(root.get("accountNumber")), searchKeyword)
            );
            return cb.and(p, cb.notEqual(root.get("state"), State.DELETED));
        };
    }

    @Query(value = """
            SELECT new com.optimize.elykia.client.dto.AccountRespDto(a.id, a.accountNumber,
                c.id, a.accountBalance, a.status, a.createdDate)
                FROM Account a JOIN a.client c WHERE (c.collector = :commercial OR c.tontineCollector = :commercial OR c.recoveryCollector = :commercial) AND a.state = :state AND c.clientType = :clientType AND a.status = :status
    """)
    Page<AccountRespDto> getAccountForCommercial(String commercial, State state, ClientType clientType, AccountStatus status, Pageable pageable);

    //@Query("SELECT a FROM Account a WHERE a.client.collector = ?1 AND a.client.clientType = ?2")
    Page<Account> findByClient_collectorAndClient_clientType(String collector, ClientType clientType, Pageable pageable);

    @Query("SELECT new com.optimize.elykia.client.dto.AccountRespDto(" +
           "a.id, " +
           "a.accountNumber, " +
           "c.id, " +
           "a.accountBalance, " +
           "a.status, " +
           "a.createdDate) " +
           "FROM Account a " +
           "JOIN a.client c " +
           "WHERE a.state <> :state " +
           "AND (:searchTerm IS NULL OR (" +
           "LOWER(a.accountNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(c.firstname) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(c.lastname) LIKE LOWER(CONCAT('%', :searchTerm, '%'))))")
    Page<AccountRespDto> findAccountsDto(@Param("searchTerm") String searchTerm, @Param("state") State state, Pageable pageable);
}
