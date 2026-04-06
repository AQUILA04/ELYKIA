package com.optimize.elykia.core.entity.sale;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.entity.article.Articles;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
public class OrderItem extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonBackReference
    private Order order;

    @ManyToOne(optional = false)
    @JoinColumn(name = "article_id", nullable = false)
    private Articles article;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double unitPrice;
}
