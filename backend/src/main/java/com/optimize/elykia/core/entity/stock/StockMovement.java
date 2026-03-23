package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.enumaration.MovementType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@Table(name = "stock_movement")
public class StockMovement extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(cascade = CascadeType.MERGE)
    @JoinColumn(name = "article_id")
    private Articles article;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type")
    private MovementType type; // ENTRY, RELEASE, RETURN, ADJUSTMENT, LOSS
    
    @Column(name = "quantity")
    private Integer quantity;
    
    @Column(name = "stock_before")
    private Integer stockBefore;
    
    @Column(name = "stock_after")
    private Integer stockAfter;
    
    @Column(name = "movement_date")
    private LocalDateTime movementDate;
    
    @Column(name = "reason")
    private String reason;
    
    @Column(name = "performed_by")
    private String performedBy;
    
    @ManyToOne(cascade = CascadeType.MERGE)
    @JoinColumn(name = "related_credit_id")
    private Credit relatedCredit; // Si lié à une vente
    
    @Column(name = "unit_cost")
    private Double unitCost; // Coût unitaire au moment du mouvement
}
