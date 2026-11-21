package com.optimize.elykia.sale.api;

import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditTimeline;

/**
 * SPI port decoupling {@code sale} from real-time BI sales & collection aggregation.
 */
public interface SaleBiAggregationPort {

    void updateSalesAggregation(Credit credit);

    void updateCollectionAggregation(CreditTimeline creditTimeline);
}
