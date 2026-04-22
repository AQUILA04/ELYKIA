package com.optimize.elykia.core.dto.sale;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;

public class RattrapageCreditDto {

    @NotBlank(message = "Le commercial est obligatoire")
    private String commercial;

    @NotNull(message = "Le client est obligatoire")
    private Long clientId;

    @NotNull(message = "Le stock source est obligatoire")
    private Long sourceStockId;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDate beginDate;

    @NotNull(message = "La mise journalière est obligatoire")
    @Min(value = 200, message = "La mise journalière doit être au minimum 200 FCFA")
    private Double dailyStake;

    @PositiveOrZero(message = "L'avance doit être positive ou nulle")
    private Double advance = 0.0;

    // Optionnel, sera recalculé côté backend
    private LocalDate expectedEndDate;

    private String note;

    @NotEmpty(message = "La liste des articles est obligatoire")
    @Valid
    private List<RattrapageItemDto> items;

    // ===== Getters / Setters =====

    public String getCommercial() {
        return commercial;
    }

    public void setCommercial(String commercial) {
        this.commercial = commercial;
    }

    public Long getClientId() {
        return clientId;
    }

    public void setClientId(Long clientId) {
        this.clientId = clientId;
    }

    public Long getSourceStockId() {
        return sourceStockId;
    }

    public void setSourceStockId(Long sourceStockId) {
        this.sourceStockId = sourceStockId;
    }

    public LocalDate getBeginDate() {
        return beginDate;
    }

    public void setBeginDate(LocalDate beginDate) {
        this.beginDate = beginDate;
    }

    public Double getDailyStake() {
        return dailyStake;
    }

    public void setDailyStake(Double dailyStake) {
        this.dailyStake = dailyStake;
    }

    public Double getAdvance() {
        return advance;
    }

    public void setAdvance(Double advance) {
        this.advance = advance;
    }

    public LocalDate getExpectedEndDate() {
        return expectedEndDate;
    }

    public void setExpectedEndDate(LocalDate expectedEndDate) {
        this.expectedEndDate = expectedEndDate;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public List<RattrapageItemDto> getItems() {
        return items;
    }

    public void setItems(List<RattrapageItemDto> items) {
        this.items = items;
    }

    // ===== Inner DTO =====

    public static class RattrapageItemDto {

        @NotNull(message = "L'identifiant du stock item est obligatoire")
        private Long stockItemId;

        @NotNull(message = "L'identifiant de l'article est obligatoire")
        private Long articleId;

        @NotNull(message = "La quantité est obligatoire")
        @Positive(message = "La quantité doit être supérieure à 0")
        private Integer quantity;

        @NotNull(message = "Le prix unitaire est obligatoire")
        @Positive(message = "Le prix unitaire doit être supérieur à 0")
        private Double unitPrice;

        public Long getStockItemId() {
            return stockItemId;
        }

        public void setStockItemId(Long stockItemId) {
            this.stockItemId = stockItemId;
        }

        public Long getArticleId() {
            return articleId;
        }

        public void setArticleId(Long articleId) {
            this.articleId = articleId;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }

        public Double getUnitPrice() {
            return unitPrice;
        }

        public void setUnitPrice(Double unitPrice) {
            this.unitPrice = unitPrice;
        }
    }
}
