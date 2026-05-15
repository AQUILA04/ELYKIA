package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.MobileTransactionDto;
import com.optimize.elykia.core.dto.RecoveryDto;
import com.optimize.elykia.core.entity.MobileTransaction;
import com.optimize.elykia.core.entity.Recovery;
import com.optimize.elykia.core.mapper.RecoveryMapper;
import com.optimize.elykia.core.mapper.TransactionMapper;
import com.optimize.elykia.core.service.util.MobileTransactionService;
import com.optimize.elykia.core.service.util.RecoveryService;
import com.optimize.elykia.core.service.commercial.CommercialDataSummaryService;
import com.optimize.elykia.core.service.sale.CreditTimelineService;
import com.optimize.elykia.core.service.sale.ClientReliquatService;
import com.optimize.elykia.core.dto.ReliquatSyncDto;
import com.optimize.elykia.core.dto.ReliquatSyncResponseDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/mobiles")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "API spécifique pour l'application mobile")
@CrossOrigin
public class MobileController {
    private final MobileTransactionService mobileTransactionService;
    private final RecoveryService recoveryService;
    private final RecoveryMapper recoveryMapper;
    private final TransactionMapper transactionMapper;
    private final CreditTimelineService creditTimelineService;
    private final com.optimize.elykia.core.mapper.CreditTimelineMobileMapper creditTimelineMobileMapper;
    private final CommercialDataSummaryService commercialDataSummaryService;
    private final ClientReliquatService clientReliquatService;

    @GetMapping(value = "recoveries/{commercialId}")
    public ResponseEntity<Response> getRecoveriesByCommercial(@PathVariable String commercialId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(recoveryService.getAllRecoveriesByCommercial(commercialId), "Les recouvrements sont récupérés avec succès !"), HttpStatus.OK);
    }

    @PostMapping(value = "recoveries")
    public ResponseEntity<Response> createRecovery(@Valid @RequestBody RecoveryDto dto) {
        Recovery recovery = recoveryMapper.toEntity(dto);
        recovery.setId(null);
        return new ResponseEntity<>(ResponseUtil.successResponse(recoveryService.create(recovery), "Recouvrement enregistré avec succès !"), HttpStatus.CREATED);
    }

    @PostMapping(value = "transactions")
    public ResponseEntity<Response> createTransaction(@Valid @RequestBody MobileTransactionDto dto) {
        MobileTransaction transaction = transactionMapper.toEntity(dto);
        transaction.setId(null);
        return new ResponseEntity<>(ResponseUtil.successResponse(mobileTransactionService.create(transaction), "Transaction enregistrée avec succès !"), HttpStatus.CREATED);
    }


    @GetMapping(value = "transactions/{commercialId}")
    public ResponseEntity<Response> getTransactionByCommercial(@PathVariable String commercialId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(mobileTransactionService.getAllTransactionByCommercial(commercialId), "Les transactions sont récupérés récupérés avec succès !"), HttpStatus.OK);
    }

    /**
     * Récupère les CreditTimeline (recouvrements) des 30 derniers jours pour un collector
     * Utilisé par l'application mobile lors de l'initialisation
     * @param commercialId Username du collector
     * @return Liste des CreditTimeline mappés en format Recovery mobile
     */
    @GetMapping(value = "credit-timelines/{commercialId}")
    public ResponseEntity<Response> getCreditTimelinesByCollector(@PathVariable String commercialId) {
        log.info("Récupération des CreditTimeline des 30 derniers jours pour le collector: {}", commercialId);
        // Utilisation de la méthode optimisée avec projection DTO directe
        var mobileDtos = creditTimelineService.getLast30DaysMobileDtosByCollector(commercialId);
        log.info("Nombre de CreditTimeline récupérés: {}", mobileDtos.size());
        return new ResponseEntity<>(ResponseUtil.successResponse(mobileDtos, "Les recouvrements sont récupérés avec succès !"), HttpStatus.OK);
    }

    /**
     * Récupère le résumé des données d'un commercial
     * Utilisé pour vérifier la complétude de l'initialisation mobile
     * @param commercialId Username du commercial
     * @return Résumé avec tous les totaux
     */
    @GetMapping(value = "data-summary/{commercialId}")
    public ResponseEntity<Response> getDataSummary(@PathVariable String commercialId) {
        log.info("Récupération du résumé des données pour le commercial: {}", commercialId);
        var summary = commercialDataSummaryService.generateSummary(commercialId);
        log.info("Résumé généré: {} clients, {} distributions", summary.getTotalClients(), summary.getTotalDistributions());
        return new ResponseEntity<>(ResponseUtil.successResponse(summary, "Résumé des données récupéré avec succès !"), HttpStatus.OK);
    }

    @GetMapping(value = "reliquats")
    public ResponseEntity<Response> getReliquatsByCommercial(@RequestParam("commercial") String commercialUsername) {
        log.info("Récupération des reliquats pour le commercial: {}", commercialUsername);
        var reliquats = clientReliquatService.findByCommercial(commercialUsername);
        
        // Transform ClientReliquat to DTOs
        var dtos = reliquats.stream().map(r -> {
            com.optimize.elykia.core.dto.ReliquatSyncUnitDto dto = new com.optimize.elykia.core.dto.ReliquatSyncUnitDto();
            dto.setClientId(r.getClient().getId());
            dto.setTotalAmount(r.getTotalAmount());
            dto.setLastRecoveryId(r.getLastRecoveryId());
            dto.setLastAccountedDate(r.getLastAccountedDate() != null ? r.getLastAccountedDate().toString() : null);
            dto.setId(r.getId().toString());
            return dto;
        }).toList();

        // Enveloppe dans "content" comme le frontend l'attend
        var pageResponse = new java.util.HashMap<String, Object>();
        pageResponse.put("content", dtos);

        return new ResponseEntity<>(ResponseUtil.successResponse(pageResponse, "Les reliquats sont récupérés avec succès !"), HttpStatus.OK);
    }

    @PostMapping(value = "reliquats/sync")
    public ResponseEntity<Response> syncReliquats(@RequestBody ReliquatSyncDto dto) {
        log.info("Synchronisation des reliquats pour le commercial: {}", dto.getCommercialId());
        java.util.List<String> successIds = new java.util.ArrayList<>();
        
        if (dto.getReliquats() != null) {
            for (var r : dto.getReliquats()) {
                try {
                    // Update the reliquat amount using addReliquat
                    // In a real sync we might just replace it or apply delta. 
                    // Let's assume the mobile sends the current totalAmount, we'll set it.
                    // But our service has addReliquat / consumeReliquat. 
                    // So we can use a setReliquat if we want, or just fetch and update.
                    // For the MVP, let's just create/update directly here since it's the sync endpoint.
                    
                    var existing = clientReliquatService.getReliquatForClient(r.getClientId());
                    // To keep it simple, we use a dedicated sync method in ClientReliquatService, 
                    // but since we only have add/consume, let's do a delta.
                    double delta = r.getTotalAmount() - existing;
                    java.time.LocalDate date = r.getLastAccountedDate() != null ? java.time.LocalDate.parse(r.getLastAccountedDate()) : null;
                    if (delta > 0) {
                        clientReliquatService.addReliquat(r.getClientId(), delta, r.getLastRecoveryId(), date);
                    } else if (delta < 0) {
                        clientReliquatService.consumeReliquat(r.getClientId(), -delta, r.getLastRecoveryId(), date);
                    } else {
                        // Delta == 0, maybe just update dates. 
                        // But we just mark it success.
                    }
                    successIds.add(r.getId());
                } catch (Exception e) {
                    log.error("Failed to sync reliquat for client {}", r.getClientId(), e);
                }
            }
        }
        
        ReliquatSyncResponseDto responseDto = new ReliquatSyncResponseDto(successIds);
        return new ResponseEntity<>(ResponseUtil.successResponse(responseDto, "Synchronisation des reliquats réussie !"), HttpStatus.OK);
    }
}
