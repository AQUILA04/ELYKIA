package com.optimize.elykia.customer.web.dto;

import com.optimize.elykia.customer.domain.PaymentProofOcrStatus;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CustomerPaymentProofDto {
    Long id;
    String fileName;
    String contentType;
    long size;
    PaymentProofOcrStatus ocrStatus;
    String detectedReference;
}
