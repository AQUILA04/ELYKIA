package com.optimize.elykia.client.dto;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.client.enumeration.ClientType;

public record ClientSearchDto(String keyword,
                              ClientType clientType,
                              String collector,
                              String tontineCollector,
                              String agencyCollector,
                              Boolean isTontineMember,
                              Boolean hasCreditInProgress,
                              State state) {
}
