package com.optimize.elykia.core.entity.stock;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.article.Articles;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class CommercialMonthlyStockItem extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JsonIgnore
    private CommercialMonthlyStock monthlyStock;

    @ManyToOne
    private Articles article;

    // Quantité totale sortie du magasin pour ce mois
    private Integer quantityTaken = 0;

    // Quantité vendue aux clients (distribuée)
    private Integer quantitySold = 0;

    // Quantité retournée au magasin
    private Integer quantityReturned = 0;

    // Quantité restante chez le commercial (Taken - Sold - Returned - Debt)
    private Integer quantityRemaining = 0;

    // Quantité transformée en dette (quitte le reste ; reste après règlement)
    private Integer quantityDebt = 0;

    // Prix unitaire figé au moment du transfert reste → dette
    @Column(columnDefinition = "double precision default 0")
    private Double debtUnitPrice = 0.0;

    // Prix moyen pondéré ou dernier prix connu pour ce mois
    // Utile pour les calculs de valorisation du stock restant
    @Column(columnDefinition = "double precision default 0")
    private Double weightedAverageUnitPrice = 0.0;

    // Total financial value of sold items, accurately aggregated at the specific
    // PMP of each sale
    @Column(columnDefinition = "double precision default 0")
    private Double totalSoldValue = 0.0;

    @Column(columnDefinition = "double precision default 0")
    private Double totalMargeValue = 0.0;

    @Column(columnDefinition = "double precision default 0")
    private Double weightedAveragePurchasePrice = 0.0;

    // Prix unitaire réel au moment de la dernière mise à jour
    @Column(columnDefinition = "double precision default 0")
    private Double lastUnitPrice = 0.0;

    @Column(columnDefinition = "double precision default 0")
    private Double lastPurchasePrice = 0.0;

    public void updateRemaining() {
        int taken = this.quantityTaken != null ? this.quantityTaken : 0;
        int sold = this.quantitySold != null ? this.quantitySold : 0;
        int returned = this.quantityReturned != null ? this.quantityReturned : 0;
        int debt = this.quantityDebt != null ? this.quantityDebt : 0;
        this.quantityRemaining = taken - sold - returned - debt;
    }

    public double debtValue() {
        int debt = this.quantityDebt != null ? this.quantityDebt : 0;
        double unit = this.debtUnitPrice != null ? this.debtUnitPrice : 0D;
        return debt * unit;
    }
}
