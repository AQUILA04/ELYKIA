package com.optimize.elykia.core.entity.tontine;

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
@Table(name = "tontine_stock_layer_sale_pack", uniqueConstraints = @UniqueConstraint(
        name = "uk_tontine_layer_sale_pack", columnNames = {"layer_id", "quantity"}))
@Getter
@Setter
@NoArgsConstructor
public class TontineStockLayerSalePack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "layer_id", nullable = false)
    @JsonIgnore
    private TontineStockLayer layer;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "sale_price", nullable = false)
    private Double salePrice;
}
