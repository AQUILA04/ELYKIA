package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.sale.ClientReliquat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClientReliquatRepository extends JpaRepository<ClientReliquat, Long> {
    
    Optional<ClientReliquat> findByClientId(Long clientId);

    @Query("SELECT r FROM ClientReliquat r JOIN FETCH r.client c WHERE c.id IN :clientIds")
    List<ClientReliquat> findByClientIdIn(@Param("clientIds") Collection<Long> clientIds);

    /**
     * Soldes positifs visibles par un commercial, mêmes portefeuilles que le sync clients
     * (crédit, tontine, agence, recouvrement).
     */
    @Query("""
            SELECT r FROM ClientReliquat r JOIN FETCH r.client c
            WHERE r.totalAmount > 0
              AND (c.collector = :commercial
                OR c.tontineCollector = :commercial
                OR c.agencyCollector = :commercial
                OR c.recoveryCollector = :commercial)
            """)
    List<ClientReliquat> findPositiveByCommercial(@Param("commercial") String commercial);

}
