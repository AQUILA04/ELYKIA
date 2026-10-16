package com.optimize.elykia.core.repository.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.customer.MobileMoneyWithdrawalFeeBracket;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MobileMoneyWithdrawalFeeBracketRepository
        extends GenericRepository<MobileMoneyWithdrawalFeeBracket, Long> {

    List<MobileMoneyWithdrawalFeeBracket> findByStateOrderByNetworkAscMinAmountAsc(State state);

    List<MobileMoneyWithdrawalFeeBracket> findByNetworkAndStateOrderByMinAmountAsc(String network, State state);

    @Query("""
            SELECT b FROM MobileMoneyWithdrawalFeeBracket b
            WHERE b.network = :network
              AND b.state = :state
              AND b.minAmount <= :amount
              AND b.maxAmount >= :amount
            ORDER BY b.minAmount ASC
            """)
    List<MobileMoneyWithdrawalFeeBracket> findCovering(
            @Param("network") String network,
            @Param("state") State state,
            @Param("amount") Long amount);

    default Optional<MobileMoneyWithdrawalFeeBracket> findFee(String network, State state, long amount) {
        List<MobileMoneyWithdrawalFeeBracket> matches = findCovering(network, state, amount);
        return matches.isEmpty() ? Optional.empty() : Optional.of(matches.get(0));
    }
}
