package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.sale.Order;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "stock_request_order")
@Getter
@Setter
@NoArgsConstructor
public class StockRequestOrderLink extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_request_id", nullable = false)
    private StockRequest stockRequest;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;
}
