package com.optimize.elykia.core.entity.sale;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Immutable
@Table(name = "credit_distribution_view")
@Getter
@Setter
public class CreditDistributionView {

    @EmbeddedId
    private CreditDistributionViewId id;

    @Column(name = "parent_reference")
    private String parentReference;

    @Column(name = "article_name")
    private String articleName;

    @Column(name = "brand")
    private String brand;

    @Column(name = "model")
    private String model;

    @Column(name = "parent_quantity")
    private Integer parentQuantity;

    @Column(name = "distributed_quantity")
    private Long distributedQuantity;

    @Column(name = "undistributed_quantity")
    private Long undistributedQuantity;
}
