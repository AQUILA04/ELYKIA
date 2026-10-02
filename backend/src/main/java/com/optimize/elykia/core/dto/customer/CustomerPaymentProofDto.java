package com.optimize.elykia.core.dto.customer;

import com.optimize.elykia.core.enumaration.PaymentProofOcrStatus;
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
