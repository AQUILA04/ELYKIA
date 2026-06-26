package com.optimize.elykia.core.ai.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.ai.admin.AiAdminStatsService;
import com.optimize.elykia.core.ai.admin.dto.AiAdminStatsDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/ai/admin")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Elykia IA — Admin")
@CrossOrigin
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
@PreAuthorize("hasRole('ROLE_AI_REPORT')")
public class AiAdminController {

    private final AiAdminStatsService adminStatsService;

    @GetMapping("/stats")
    @Operation(summary = "Statistiques IA (requêtes fréquentes, SQL rejetés, latence)")
    public ResponseEntity<Response> stats(@RequestParam(defaultValue = "30") int days) {
        int period = Math.min(Math.max(days, 1), 90);
        AiAdminStatsDto stats = adminStatsService.getStats(period);
        return new ResponseEntity<>(ResponseUtil.successResponse(stats), HttpStatus.OK);
    }
}
