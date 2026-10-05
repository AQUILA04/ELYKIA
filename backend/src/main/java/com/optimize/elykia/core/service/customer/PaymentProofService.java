package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.core.config.PaymentProofProperties;
import com.optimize.elykia.core.dto.customer.CustomerPaymentProofDto;
import com.optimize.elykia.core.entity.customer.CustomerPaymentProof;
import com.optimize.elykia.core.enumaration.PaymentProofLinkedType;
import com.optimize.elykia.core.enumaration.PaymentProofOcrStatus;
import com.optimize.elykia.core.repository.customer.CustomerPaymentProofRepository;
import com.optimize.elykia.core.service.ocr.OcrEngine;
import com.optimize.elykia.core.service.ocr.OcrException;
import com.optimize.elykia.core.service.ocr.PaymentReferenceExtractor;
import com.optimize.elykia.core.service.ocr.PdfProofTextService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PaymentProofService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "application/pdf");

    private final CustomerPaymentProofRepository proofRepository;
    private final MinioStorageService minioStorageService;
    private final MinioProperties minioProperties;
    private final PaymentProofProperties properties;
    private final OcrEngine ocrEngine;
    private final PaymentReferenceExtractor referenceExtractor;
    private final PdfProofTextService pdfProofTextService;

    public record ProofDownload(Resource resource, String fileName, String contentType) {
    }

    public CustomerPaymentProofDto upload(Long clientId, MultipartFile file, Long replacesProofId) {
        if (file == null || file.isEmpty()) {
            throw new CustomValidationException("Le justificatif est obligatoire.");
        }
        if (file.getSize() > properties.getMaxBytes()) {
            throw new CustomValidationException("Le justificatif ne doit pas dépasser 5 Mo.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new CustomValidationException("Impossible de lire le fichier justificatif.");
        }

        DetectedType detected = detectType(bytes, file.getContentType());
        String sha256 = sha256Hex(bytes);

        if (replacesProofId != null) {
            deleteUnlinkedOwned(clientId, replacesProofId);
        }

        List<CustomerPaymentProof> existing = proofRepository.findUnlinkedByClientAndSha256(
                clientId, sha256, State.ENABLED);
        if (!existing.isEmpty()) {
            return toDto(existing.get(0));
        }

        OcrOutcome ocr = runOcr(bytes, detected);

        String extension = detected.extension();
        String objectKey = "payment-proofs/" + clientId + "/" + UUID.randomUUID() + "." + extension;
        String bucket = minioProperties.getBucket();
        minioStorageService.uploadObject(bucket, objectKey, bytes, detected.contentType());

        CustomerPaymentProof proof = new CustomerPaymentProof();
        proof.setClientId(clientId);
        proof.setBucket(bucket);
        proof.setObjectKey(objectKey);
        proof.setContentType(detected.contentType());
        proof.setOriginalFileName(sanitizeFileName(file.getOriginalFilename(), extension));
        proof.setSizeBytes((long) bytes.length);
        proof.setSha256(sha256);
        proof.setOcrStatus(ocr.status());
        proof.setOcrReference(ocr.reference());
        proof.setOcrText(truncate(ocr.rawText(), 20_000));
        proof.setCreatedBy(String.valueOf(clientId));
        proof.setState(State.ENABLED);
        proof = proofRepository.save(proof);
        return toDto(proof);
    }

    public void deleteUnlinkedOwned(Long clientId, Long proofId) {
        CustomerPaymentProof proof = proofRepository.findByIdAndClientIdAndState(proofId, clientId, State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("Justificatif introuvable."));
        if (proof.getLinkedId() != null) {
            throw new CustomValidationException("Ce justificatif est déjà rattaché à une déclaration.");
        }
        deleteProof(proof);
    }

    public CustomerPaymentProof requireUnlinkedOwned(Long clientId, Long proofId) {
        if (proofId == null) {
            if (properties.isRequired()) {
                throw new CustomValidationException("Le justificatif de paiement est obligatoire.");
            }
            return null;
        }
        CustomerPaymentProof proof = proofRepository.findByIdAndClientIdAndState(proofId, clientId, State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("Justificatif introuvable."));
        if (proof.getLinkedId() != null) {
            throw new CustomValidationException("Ce justificatif est déjà utilisé sur une autre déclaration.");
        }
        return proof;
    }

    public void link(CustomerPaymentProof proof, PaymentProofLinkedType type, Long submissionId) {
        if (proof == null) {
            return;
        }
        if (proof.getLinkedId() != null) {
            throw new CustomValidationException("Ce justificatif est déjà rattaché.");
        }
        proof.setLinkedType(type);
        proof.setLinkedId(submissionId);
        proof.setLinkedAt(LocalDateTime.now());
        proofRepository.save(proof);
    }

    @Transactional(readOnly = true)
    public CustomerPaymentProof findById(Long proofId) {
        if (proofId == null) {
            return null;
        }
        return proofRepository.findById(proofId).orElse(null);
    }

    @Transactional(readOnly = true)
    public ProofDownload download(CustomerPaymentProof proof) {
        if (proof == null) {
            throw new ResourceNotFoundException("Justificatif introuvable.");
        }
        byte[] data = minioStorageService.downloadObject(proof.getBucket(), proof.getObjectKey());
        String fileName = StringUtils.hasText(proof.getOriginalFileName())
                ? proof.getOriginalFileName()
                : "justificatif";
        return new ProofDownload(
                new ByteArrayResource(data),
                fileName,
                proof.getContentType());
    }

    @Transactional(readOnly = true)
    public boolean isDuplicateProof(CustomerPaymentProof proof, PaymentProofLinkedType type, Long submissionId) {
        if (proof == null) {
            return false;
        }
        if (StringUtils.hasText(proof.getSha256())
                && proofRepository.existsOtherLinkedWithSha256(
                        proof.getSha256(), type, submissionId, State.ENABLED)) {
            return true;
        }
        if (StringUtils.hasText(proof.getOcrReference())
                && proofRepository.existsOtherLinkedWithOcrReference(
                        proof.getOcrReference(), type, submissionId, State.ENABLED)) {
            return true;
        }
        return false;
    }

    @Transactional(readOnly = true)
    public boolean isReferenceMismatch(CustomerPaymentProof proof, String declaredReference) {
        if (proof == null || !StringUtils.hasText(proof.getOcrReference()) || !StringUtils.hasText(declaredReference)) {
            return false;
        }
        return !normalizeRef(proof.getOcrReference()).equals(normalizeRef(declaredReference));
    }

    public int purgeUnlinkedOlderThanRetention() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(Math.max(1, properties.getUnlinkedRetentionHours()));
        List<CustomerPaymentProof> stale = proofRepository.findUnlinkedOlderThan(cutoff, State.ENABLED);
        for (CustomerPaymentProof proof : stale) {
            try {
                deleteProof(proof);
            } catch (Exception e) {
                log.warn("Failed to purge payment proof id={}: {}", proof.getId(), e.getMessage());
            }
        }
        return stale.size();
    }

    public boolean isRequired() {
        return properties.isRequired();
    }

    private void deleteProof(CustomerPaymentProof proof) {
        try {
            minioStorageService.deleteObject(proof.getBucket(), proof.getObjectKey());
        } catch (Exception e) {
            log.warn("MinIO delete failed for proof id={} key={}: {}",
                    proof.getId(), proof.getObjectKey(), e.getMessage());
        }
        proofRepository.delete(proof);
    }

    private OcrOutcome runOcr(byte[] bytes, DetectedType detected) {
        try {
            String rawText;
            if ("application/pdf".equals(detected.contentType())) {
                PdfProofTextService.PdfTextResult pdf = pdfProofTextService.extract(bytes);
                if (StringUtils.hasText(pdf.digitalText()) && pdf.digitalText().trim().length() >= 20) {
                    rawText = pdf.digitalText();
                } else if (pdf.pageImagePng() != null && ocrEngine.isAvailable()) {
                    rawText = ocrEngine.extractText(pdf.pageImagePng());
                } else if (!ocrEngine.isAvailable()) {
                    return new OcrOutcome(PaymentProofOcrStatus.UNAVAILABLE, null, pdf.digitalText());
                } else {
                    rawText = pdf.digitalText();
                }
            } else {
                if (!ocrEngine.isAvailable()) {
                    return new OcrOutcome(PaymentProofOcrStatus.UNAVAILABLE, null, null);
                }
                rawText = ocrEngine.extractText(bytes);
            }
            String reference = referenceExtractor.extract(rawText);
            if (StringUtils.hasText(reference)) {
                return new OcrOutcome(PaymentProofOcrStatus.SUCCESS, reference, rawText);
            }
            return new OcrOutcome(PaymentProofOcrStatus.NO_REFERENCE, null, rawText);
        } catch (OcrException | IOException e) {
            log.warn("OCR failed for payment proof: {}", e.getMessage());
            return new OcrOutcome(PaymentProofOcrStatus.FAILED, null, null);
        }
    }

    private static DetectedType detectType(byte[] bytes, String declaredContentType) {
        if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return new DetectedType("image/jpeg", "jpg");
        }
        if (bytes.length >= 8
                && (bytes[0] & 0xFF) == 0x89
                && bytes[1] == 0x50
                && bytes[2] == 0x4E
                && bytes[3] == 0x47) {
            return new DetectedType("image/png", "png");
        }
        if (bytes.length >= 5
                && bytes[0] == 0x25
                && bytes[1] == 0x50
                && bytes[2] == 0x44
                && bytes[3] == 0x46) {
            return new DetectedType("application/pdf", "pdf");
        }
        String normalized = declaredContentType != null ? declaredContentType.toLowerCase(Locale.ROOT).trim() : "";
        if (ALLOWED_CONTENT_TYPES.contains(normalized)) {
            // Magic bytes failed — refuse rather than trust the client header alone for uploads.
            throw new CustomValidationException(
                    "Format de justificatif non reconnu (JPEG, PNG ou PDF uniquement).");
        }
        throw new CustomValidationException("Format de justificatif non accepté (JPEG, PNG ou PDF uniquement).");
    }

    private static String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private static String sanitizeFileName(String original, String extension) {
        if (!StringUtils.hasText(original)) {
            return "justificatif." + extension;
        }
        String cleaned = original.replaceAll("[\\\\/\\r\\n\"']", "_");
        if (cleaned.length() > 200) {
            cleaned = cleaned.substring(0, 200);
        }
        return cleaned;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String normalizeRef(String value) {
        return value.trim().replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }

    private static CustomerPaymentProofDto toDto(CustomerPaymentProof proof) {
        return CustomerPaymentProofDto.builder()
                .id(proof.getId())
                .fileName(proof.getOriginalFileName())
                .contentType(proof.getContentType())
                .size(proof.getSizeBytes() != null ? proof.getSizeBytes() : 0L)
                .ocrStatus(proof.getOcrStatus())
                .detectedReference(proof.getOcrReference())
                .build();
    }

    private record DetectedType(String contentType, String extension) {
    }

    private record OcrOutcome(PaymentProofOcrStatus status, String reference, String rawText) {
    }
}
