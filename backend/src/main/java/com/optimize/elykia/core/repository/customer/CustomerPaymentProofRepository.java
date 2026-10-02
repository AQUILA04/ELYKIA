package com.optimize.elykia.core.repository.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.customer.CustomerPaymentProof;
import com.optimize.elykia.core.enumaration.PaymentProofLinkedType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CustomerPaymentProofRepository extends JpaRepository<CustomerPaymentProof, Long> {

    Optional<CustomerPaymentProof> findByIdAndClientIdAndState(Long id, Long clientId, State state);

    @Query("""
            SELECT p FROM CustomerPaymentProof p
            WHERE p.clientId = :clientId
              AND p.sha256 = :sha256
              AND p.linkedId IS NULL
              AND p.state = :state
            ORDER BY p.createdDate DESC
            """)
    List<CustomerPaymentProof> findUnlinkedByClientAndSha256(
            @Param("clientId") Long clientId,
            @Param("sha256") String sha256,
            @Param("state") State state);

    @Query("""
            SELECT p FROM CustomerPaymentProof p
            WHERE p.linkedId IS NULL
              AND p.state = :state
              AND p.createdDate < :before
            """)
    List<CustomerPaymentProof> findUnlinkedOlderThan(
            @Param("before") LocalDateTime before,
            @Param("state") State state);

    @Query("""
            SELECT COUNT(p) > 0 FROM CustomerPaymentProof p
            WHERE p.sha256 = :sha256
              AND p.state = :state
              AND p.linkedId IS NOT NULL
              AND (p.linkedType <> :excludeType OR p.linkedId <> :excludeId)
            """)
    boolean existsOtherLinkedWithSha256(
            @Param("sha256") String sha256,
            @Param("excludeType") PaymentProofLinkedType excludeType,
            @Param("excludeId") Long excludeId,
            @Param("state") State state);

    @Query("""
            SELECT COUNT(p) > 0 FROM CustomerPaymentProof p
            WHERE LOWER(p.ocrReference) = LOWER(:reference)
              AND p.state = :state
              AND p.linkedId IS NOT NULL
              AND (p.linkedType <> :excludeType OR p.linkedId <> :excludeId)
            """)
    boolean existsOtherLinkedWithOcrReference(
            @Param("reference") String reference,
            @Param("excludeType") PaymentProofLinkedType excludeType,
            @Param("excludeId") Long excludeId,
            @Param("state") State state);
}
