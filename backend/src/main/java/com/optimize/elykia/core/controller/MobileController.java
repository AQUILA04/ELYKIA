package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.MobileTransactionDto;
import com.optimize.elykia.core.dto.RecoveryDto;
import com.optimize.elykia.core.entity.MobileTransaction;
import com.optimize.elykia.core.entity.Recovery;
import com.optimize.elykia.core.mapper.RecoveryMapper;
import com.optimize.elykia.core.mapper.TransactionMapper;
import com.optimize.elykia.core.service.MobileTransactionService;
import com.optimize.elykia.core.service.RecoveryService;
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
    private final com.optimize.elykia.core.service.CreditTimelineService creditTimelineService;
    private final com.optimize.elykia.core.mapper.CreditTimelineMobileMapper creditTimelineMobileMapper;
    private final com.optimize.elykia.core.service.CommercialDataSummaryService commercialDataSummaryService;

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
}
