package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartialDeliveryResponseDTO {

    private DeliveryType deliveryType;

    private Long deliveredRequestId;
    private String deliveredRequestReference;

    private List<DeliveredItemDTO> deliveredItems;
    private List<PendingItemDTO> pendingItems;

    private Long pendingRequestId;
    private String pendingRequestReference;

    public enum DeliveryType {
        FULL, PARTIAL
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveredItemDTO {
        private String itemName;
        private Integer quantity;
        private Double unitPrice;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingItemDTO {
        private String itemName;
        private Integer requestedQuantity;
        private Double availableQuantity;
        private Double unitPrice;
    }
}
