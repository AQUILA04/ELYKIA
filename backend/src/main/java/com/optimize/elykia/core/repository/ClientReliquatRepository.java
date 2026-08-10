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

}
