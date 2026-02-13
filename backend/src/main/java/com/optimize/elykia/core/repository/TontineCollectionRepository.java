package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.TontineCollection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TontineCollectionRepository extends GenericRepository<TontineCollection, Long> {

    Page<TontineCollection> findByTontineMember_Id(Long memberId, Pageable pageable);

    @Query("SELECT SUM(tc.amount) FROM TontineCollection tc WHERE tc.tontineMember.id = :memberId AND tc.isDeliveryCollection = true AND tc.state = :state")
    Double sumDeliveryCollectionsByMember(@Param("memberId") Long memberId, @Param("state") State state);

    @Query("SELECT SUM(tc.amount) FROM TontineCollection tc WHERE tc.tontineMember.tontineSession.id = :sessionId AND tc.isDeliveryCollection = true AND tc.state = :state")
    Double sumDeliveryCollectionsBySession(@Param("sessionId") Long sessionId, @Param("state") State state);

    boolean existsByReference(String reference);
    Optional<TontineCollection> findByReference(String reference);
}
