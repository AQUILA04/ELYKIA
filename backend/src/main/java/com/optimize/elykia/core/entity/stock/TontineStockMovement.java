package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.TontineStockMovementType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "tontine_stock_movement")
@Getter
@Setter
@NoArgsConstructor
public class TontineStockMovement extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tontine_stock_id", nullable = false)
    private Long tontineStockId;

    private Long creditId;

    private String creditReference;

    private Long stockTontineRequestId;

    private String stockTontineRequestReference;

    private Long stockTontineReturnId;

    private Long tontineDeliveryId;

    private String tontineDeliveryReference;

    @Column(nullable = false)
    private String collector;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    private String articleName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TontineStockMovementType movementType;

    @Column(nullable = false)
    private Integer quantityBefore;

    @Column(nullable = false)
    private Integer quantityMoved;

    @Column(nullable = false)
    private Integer quantityAfter;

    @Column(nullable = false)
    private LocalDateTime operationDate;
}
