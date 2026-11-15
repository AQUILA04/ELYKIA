package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "stock_tontine_request_delivery")
@Getter
@Setter
@NoArgsConstructor
public class StockTontineRequestDeliveryLink extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_tontine_request_id", nullable = false)
    private StockTontineRequest stockTontineRequest;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "tontine_delivery_id", nullable = false)
    private TontineDelivery delivery;
}
