package com.optimize.elykia.core.controller.sale;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.sale.RecoveryBoardService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Board de pilotage du recouvrement terrain (écran /report/daily/recovery).
 * Chef de recouvrement : toujours son propre board. Gestionnaire et admin : un chef, ou tous
 * les chefs quand {@code recoveryManagerUsername} est absent.
 */
@RestController
@RequestMapping("api/v1/recovery-manager/board")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@Tag(name = "API Chef de Recouvrement")
@CrossOrigin
public class RecoveryBoardController {

    private final RecoveryBoardService recoveryBoardService;

    @GetMapping
    @PreAuthorize("@recoveryReportAccess.canRead()")
    public ResponseEntity<Response> getBoard(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String recoveryManagerUsername,
            @RequestParam(required = false) String commercialUsername) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryBoardService.getBoard(
                        startDate, endDate, recoveryManagerUsername, commercialUsername)),
                HttpStatus.OK);
    }
}
