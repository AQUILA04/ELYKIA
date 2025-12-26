package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.proxy.HibernateProxy;

import java.util.Objects;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
public class Articles extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @PositiveOrZero
    private double purchasePrice;
    @PositiveOrZero
    private double sellingPrice;
    @PositiveOrZero
    private double creditSalePrice;
    @NotBlank
    private String name;
    @NotBlank
    private String marque;
    @NotBlank
    private String model;
    @NotBlank
    private String type;
    @PositiveOrZero
    private Integer stockQuantity = 0;

    // ===== NOUVEAUX CHAMPS POUR BI DASHBOARD =====
    @PositiveOrZero
    private Integer reorderPoint; // Seuil de réapprovisionnement

    @PositiveOrZero
    private Integer optimalStockLevel; // Niveau de stock optimal

    private Double averageMonthlySales; // Ventes moyennes mensuelles

    private Double stockTurnoverRate; // Taux de rotation du stock

    private Integer daysOfStockAvailable; // Jours de stock disponible

    private java.time.LocalDate lastRestockDate;

    private String category; // Catégorie produit pour analyse

    private Boolean isSeasonal = false; // Produit saisonnier

    public Articles(Long articleId) {
        this.id = articleId;
    }

    public void makeEntry(Integer newQuantity) {
        this.stockQuantity += newQuantity;
    }

    public void makeRelease(Integer newQuantity) {
        this.stockQuantity -= newQuantity;
    }


    @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
        Class<?> oEffectiveClass = o instanceof HibernateProxy ? ((HibernateProxy) o).getHibernateLazyInitializer().getPersistentClass() : o.getClass();
        Class<?> thisEffectiveClass = this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass() : this.getClass();
        if (thisEffectiveClass != oEffectiveClass) return false;
        Articles articles = (Articles) o;
        return getId() != null && Objects.equals(getId(), articles.getId());
    }

    public String getCommercialName() {
        return type + ": " + marque + " " + model;
    }

    @Override
    public final int hashCode() {
        return this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass().hashCode() : getClass().hashCode();
    }
}
