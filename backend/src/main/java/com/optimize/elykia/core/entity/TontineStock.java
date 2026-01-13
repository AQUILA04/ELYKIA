package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.exception.CustomValidationException;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

// add unique constraint across commercial, article_id and year
@Table(
        name = "tontine_stock",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_tontine_stock_commercial_article_year",
                columnNames = {"commercial", "article_id", "year"}
        )
)
@Getter
@Setter
@Entity
public class TontineStock extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "commercial", nullable = false)
    private String commercial;
    
    // Ce champ deviendra obsolète avec la nouvelle gestion, mais on le garde pour compatibilité temporaire
    private Long creditId;
    
    @Column(name = "article_id", nullable = false)
    private Long articleId;
    private String articleName;
    
    // Prix unitaire de référence (peut évoluer vers un PMP)
    private Double unitPrice;
    
    // Quantité totale sortie du magasin (Approvisionnement)
    private Integer totalQuantity;
    
    // Quantité disponible pour distribution (Restant)
    private Integer availableQuantity;
    
    // Quantité distribuée aux clients
    private Integer distributedQuantity;
    
    // NOUVEAU : Quantité retournée au magasin
    @Column(columnDefinition = "integer default 0")
    private Integer quantityReturned = 0;

    // NOUVEAU : Prix Moyen Pondéré (PMP) pour valorisation
    @Column(columnDefinition = "double precision default 0")
    private Double weightedAverageUnitPrice = 0.0;

    @Column(name = "year", nullable = false)
    private Integer year;
    private Long tontineSessionId;

    // Méthode utilitaire pour construire depuis l'ancienne logique (Credit)
    public static TontineStock build(Credit tontine, CreditArticles articles, TontineSession tontineSession) {
        TontineStock tontineStock = new TontineStock();
        tontineStock.articleId = articles.getArticlesId();
        tontineStock.articleName = articles.getArticles().getCommercialName();
        tontineStock.unitPrice = articles.getUnitPrice();
        tontineStock.totalQuantity = articles.getQuantity();
        tontineStock.creditId = tontine.getId();
        tontineStock.availableQuantity = articles.getQuantity();
        tontineStock.distributedQuantity = 0;
        tontineStock.quantityReturned = 0;
        tontineStock.weightedAverageUnitPrice = articles.getUnitPrice(); // Initialisation PMP
        tontineStock.setCommercial(tontine.getCollector());
        tontineStock.tontineSessionId = tontineSession.getId();
        tontineStock.year = tontineSession.getYear();
        return tontineStock;
    }

    public void addQuantity(Integer quantity) {
        this.totalQuantity += quantity;
        this.availableQuantity += quantity;
    }

    public void removeQuantity(Integer quantity) {
        if (this.availableQuantity < quantity) {
            throw new CustomValidationException("l'Article "+ this.articleName +" n'a pas assez de stock pour la livraison! \n Stock Restant: "+ this.availableQuantity);
        }
        this.availableQuantity -= quantity;
        this.distributedQuantity += quantity;
    }
    
    public void returnQuantity(Integer quantity) {
        if (this.availableQuantity < quantity) {
            throw new CustomValidationException("Impossible de retourner plus que le stock disponible ! \n Stock Restant: " + this.availableQuantity);
        }
        this.availableQuantity -= quantity;
        this.quantityReturned += quantity;
    }
}
