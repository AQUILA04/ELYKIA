package com.optimize.elykia.core.mapper;

import com.optimize.elykia.core.dto.CreditTimelineMobileDto;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Mapper pour convertir CreditTimeline vers CreditTimelineMobileDto
 * Format compatible avec le modèle Recovery de l'application mobile
 */
@Component
public class CreditTimelineMobileMapper {

    /**
     * Convertit un CreditTimeline en CreditTimelineMobileDto
     * @param creditTimeline L'entité CreditTimeline
     * @return Le DTO pour l'application mobile
     */
    public CreditTimelineMobileDto toMobileDto(CreditTimeline creditTimeline) {
        if (creditTimeline == null) {
            return null;
        }

        CreditTimelineMobileDto dto = new CreditTimelineMobileDto();
        
        // ID converti en String
        dto.setId(creditTimeline.getId() != null ? creditTimeline.getId().toString() : null);
        
        // Montant
        dto.setAmount(creditTimeline.getAmount());
        
        // Dates
        dto.setPaymentDate(creditTimeline.getCreatedDate());
        dto.setCreatedAt(creditTimeline.getCreatedDate());
        dto.setSyncDate(LocalDateTime.now());
        
        // Type de mise
        dto.setIsDefaultStake(creditTimeline.getNormalStake());
        
        // Collector
        dto.setCommercialId(creditTimeline.getCollector());
        
        // Reference (ID mobile si existe)
        dto.setReference(creditTimeline.getReference());
        
        // Toujours synchronisé car vient du serveur
        dto.setIsSync(true);
        
        // IDs du crédit et du client
        if (creditTimeline.getCredit() != null) {
            dto.setDistributionId(creditTimeline.getCredit().getId() != null ? 
                creditTimeline.getCredit().getId().toString() : null);
            
            if (creditTimeline.getCredit().getClient() != null) {
                dto.setClientId(creditTimeline.getCredit().getClient().getId() != null ? 
                    creditTimeline.getCredit().getClient().getId().toString() : null);
            }
        }
        
        return dto;
    }

    /**
     * Convertit une liste de CreditTimeline en liste de CreditTimelineMobileDto
     * @param creditTimelines Liste des entités CreditTimeline
     * @return Liste des DTOs pour l'application mobile
     */
    public List<CreditTimelineMobileDto> toMobileDtoList(List<CreditTimeline> creditTimelines) {
        if (creditTimelines == null) {
            return null;
        }
        
        return creditTimelines.stream()
                .map(this::toMobileDto)
                .collect(Collectors.toList());
    }
}
