package com.optimize.elykia.core.mapper;

import com.optimize.elykia.core.dto.CreditTimelineMobileDto;
import com.optimize.elykia.core.dto.CreditTimelineRespDto;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CreditTimelineReliquatMappingTest {

    @Test
    void mobileMapper_exposesReliquatAmounts() {
        CreditTimeline timeline = timelineWithReliquat();

        CreditTimelineMobileDto dto = new CreditTimelineMobileMapper().toMobileDto(timeline);

        assertEquals(450.0, dto.getReliquatGeneratedAmount());
        assertEquals(200.0, dto.getReliquatUsedAmount());
    }

    @Test
    void webResponse_exposesReliquatAmounts() {
        CreditTimelineRespDto dto = CreditTimelineRespDto.fromEntity(timelineWithReliquat());

        assertEquals(450.0, dto.reliquatGeneratedAmount());
        assertEquals(200.0, dto.reliquatUsedAmount());
    }

    private CreditTimeline timelineWithReliquat() {
        CreditTimeline timeline = new CreditTimeline();
        timeline.setId(1L);
        timeline.setReference("REC-TEST");
        timeline.setAmount(800.0);
        timeline.setReliquatGeneratedAmount(450.0);
        timeline.setReliquatUsedAmount(200.0);
        return timeline;
    }
}
