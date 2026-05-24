package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.sale.ClientReliquat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClientReliquatRepository extends JpaRepository<ClientReliquat, Long> {
    
    Optional<ClientReliquat> findByClientId(Long clientId);

}
