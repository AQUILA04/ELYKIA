package com.optimize.elykia.core.entity.tontine;

import com.optimize.elykia.core.enumaration.ArticlePackagingType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tontine_stock_layer")
@Getter
@Setter
public class TontineStockLayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tontine_stock_id", nullable = false)
    private TontineStock tontineStock;

    @Column(name = "quantity_initial", nullable = false)
    private Integer quantityInitial;

    @Column(name = "quantity_remaining", nullable = false)
    private Integer quantityRemaining;

    @Column(name = "unit_purchase_price", nullable = false)
    private Double unitPurchasePrice;

    @Column(name = "unit_sale_price")
    private Double unitSalePrice;

    @Column(name = "wholesale_purchase_price")
    private Double wholesalePurchasePrice;

    @Column(name = "wholesale_sale_price")
    private Double wholesaleSalePrice;

    @Column(name = "half_wholesale_purchase_price")
    private Double halfWholesalePurchasePrice;

    @Column(name = "half_wholesale_sale_price")
    private Double halfWholesaleSalePrice;

    @Column(name = "units_per_package")
    private Integer unitsPerPackage;

    @Column(name = "units_per_half_package")
    private Integer unitsPerHalfPackage;

    @Enumerated(EnumType.STRING)
    @Column(name = "packaging_type")
    private ArticlePackagingType packagingType;

    @OneToMany(mappedBy = "layer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<TontineStockLayerSalePack> salePacks = new ArrayList<>();
}
