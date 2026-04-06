package com.optimize.elykia.core.entity.sale;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditWithDistribution {
    private Credit credit;
    private List<Credit> distributions;
}
