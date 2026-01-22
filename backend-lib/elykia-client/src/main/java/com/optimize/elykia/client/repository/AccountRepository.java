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
                a.client.id, a.accountBalance, a.status)
                FROM Account a JOIN Client c on c.id = a.client.id WHERE c.collector = :commercial AND a.state = :state and c.clientType = :clientType and a.status = :status
    """)
    Page<AccountRespDto> getAccountForCommercial(String commercial, State state, ClientType clientType, AccountStatus status, Pageable pageable);

    //@Query("SELECT a FROM Account a WHERE a.client.collector = ?1 AND a.client.clientType = ?2")
    Page<Account> findByClient_collectorAndClient_clientType(String collector, ClientType clientType, Pageable pageable);

}
