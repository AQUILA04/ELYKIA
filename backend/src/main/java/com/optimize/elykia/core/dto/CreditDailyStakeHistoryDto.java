package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.sale.CreditDailyStakeHistory;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CreditDailyStakeHistoryDto {
    private Long id;
    private Long creditId;
    private Double oldDailyStake;
    private Double newDailyStake;
    private LocalDateTime changeDate;
    private String author;
    private Double amountRemaining;

    public static CreditDailyStakeHistoryDto fromEntity(CreditDailyStakeHistory entity) {
        CreditDailyStakeHistoryDto dto = new CreditDailyStakeHistoryDto();
        dto.setId(entity.getId());
        dto.setCreditId(entity.getCredit().getId());
        dto.setOldDailyStake(entity.getOldDailyStake());
        dto.setNewDailyStake(entity.getNewDailyStake());
        dto.setChangeDate(entity.getChangeDate());
        dto.setAuthor(entity.getAuthor());
        dto.setAmountRemaining(entity.getAmountRemaining());
        return dto;
    }
}