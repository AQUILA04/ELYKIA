package com.optimize.elykia.core.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_delivery_item")
public class TontineDeliveryItem {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "delivery_id", nullable = false)
    @JsonBackReference
    private TontineDelivery delivery;

    @ManyToOne(optional = false)
    @JoinColumn(name = "article_id")
    private Articles articles;

    @Deprecated
    @Column(name = "article_id", updatable = false, insertable = false)
    private Long articleId;
    
    @Deprecated
    @Column(name = "article_name", nullable = false)
    private String articleName;
    
    @Deprecated
    @Column(name = "article_code")
    private String articleCode;
    
    @Column(name = "quantity", nullable = false)
    private Integer quantity;
    
    @Column(name = "unit_price", nullable = false, columnDefinition = "double precision default 0")
    private Double unitPrice;
    
    @Column(name = "total_price", nullable = false, columnDefinition = "double precision default 0")
    private Double totalPrice;
}
