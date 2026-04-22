package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TontineDeliveryRepository extends JpaRepository<TontineDelivery, Long> {
    
    @Query("SELECT d FROM TontineDelivery d LEFT JOIN FETCH d.items WHERE d.tontineMember.id = :memberId")
    Optional<TontineDelivery> findByTontineMemberId(@Param("memberId") Long memberId);
    
    boolean existsByTontineMemberId(Long memberId);
}
