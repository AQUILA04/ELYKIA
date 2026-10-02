package com.optimize.elykia.core.entity.customer;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.PaymentProofLinkedType;
import com.optimize.elykia.core.enumaration.PaymentProofOcrStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer_payment_proof")
@Getter
@Setter
@NoArgsConstructor
public class CustomerPaymentProof extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "bucket", nullable = false, length = 128)
    private String bucket;

    @Column(name = "object_key", nullable = false, length = 512)
    private String objectKey;

    @Column(name = "content_type", nullable = false, length = 128)
    private String contentType;

    @Column(name = "original_file_name", length = 255)
    private String originalFileName;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;

    @Enumerated(EnumType.STRING)
    @Column(name = "ocr_status", nullable = false, length = 30)
    private PaymentProofOcrStatus ocrStatus = PaymentProofOcrStatus.UNAVAILABLE;

    @Column(name = "ocr_reference", length = 100)
    private String ocrReference;

    @Column(name = "ocr_text", columnDefinition = "text")
    private String ocrText;

    @Enumerated(EnumType.STRING)
    @Column(name = "linked_type", length = 30)
    private PaymentProofLinkedType linkedType;

    @Column(name = "linked_id")
    private Long linkedId;

    @Column(name = "linked_at")
    private LocalDateTime linkedAt;
}
