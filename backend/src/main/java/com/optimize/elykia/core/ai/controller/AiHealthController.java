package com.optimize.elykia.core.ai.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.ai.config.AiProperties;
import com.optimize.elykia.core.ai.schema.SchemaCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/v1/ai")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Elykia IA — Santé")
@CrossOrigin
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
@PreAuthorize("hasRole('ROLE_AI_CHAT')")
public class AiHealthController {

    private final AiProperties aiProperties;
    private final SchemaCatalogService schemaCatalogService;

    @GetMapping("/health")
    @Operation(summary = "Statut du module IA")
    public ResponseEntity<Response> health() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("enabled", aiProperties.isEnabled());
        data.put("provider", aiProperties.getProvider());
        data.put("model", aiProperties.getModel());
        data.put("schemaTables", schemaCatalogService.getAllowedTables().size());
        return new ResponseEntity<>(ResponseUtil.successResponse(data), HttpStatus.OK);
    }

    @GetMapping("/schema/domains")
    @Operation(summary = "Domaines de données interrogeables")
    public ResponseEntity<Response> domains() {
        List<String> domains = List.of("credit", "recouvrement", "tontine", "stock", "rapports");
        return new ResponseEntity<>(ResponseUtil.successResponse(domains), HttpStatus.OK);
    }
}
