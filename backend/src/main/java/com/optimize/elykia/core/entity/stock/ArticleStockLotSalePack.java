package com.optimize.elykia.core.entity.stock;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "article_stock_lot_sale_pack", uniqueConstraints = @UniqueConstraint(
        name = "uk_lot_sale_pack", columnNames = {"lot_id", "quantity"}))
@Getter
@Setter
@NoArgsConstructor
public class ArticleStockLotSalePack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "lot_id", nullable = false)
    @JsonIgnore
    private ArticleStockLot lot;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "sale_price", nullable = false)
    private Double salePrice;
}
