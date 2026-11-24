package com.optimize.elykia.client.web;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.client.api.CommercialAssignmentStatus;
import com.optimize.elykia.client.api.PortfolioActivityType;
import com.optimize.elykia.client.application.ClientCollectorAssignmentService;
import com.optimize.elykia.client.application.ClientCommercialPortfolioService;
import com.optimize.elykia.client.dto.BulkAssignCollectorsDto;
import com.optimize.elykia.client.dto.BulkPortfolioOperationDto;
import com.optimize.elykia.client.dto.BulkPortfolioPreviewDto;
import com.optimize.elykia.client.entity.ClientCommercialAssignment;
import com.optimize.elykia.client.entity.ClientCommercialAssignmentHistory;
import com.optimize.elykia.shared.security.UserPermissionConstant;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/clients")
@CrossOrigin
public class ClientCollectorAssignmentController {

    private final ClientCollectorAssignmentService clientCollectorAssignmentService;
    private final ClientCommercialPortfolioService portfolioService;

    @PostMapping("bulk-assign-collectors")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR + "')")
    public ResponseEntity<Response> bulkAssignCollectors(@RequestBody @Valid BulkAssignCollectorsDto dto) {
        clientCollectorAssignmentService.bulkAssignCollectors(dto);
        return new ResponseEntity<>(ResponseUtil.successResponse(true), HttpStatus.OK);
    }

    @GetMapping("{clientId}/commercial-assignments")
    public ResponseEntity<List<ClientCommercialAssignment>> getClientAssignments(@PathVariable Long clientId) {
        return ResponseEntity.ok(portfolioService.listClientAssignments(clientId));
    }

    @GetMapping("{clientId}/commercial-assignments/history")
    public ResponseEntity<List<ClientCommercialAssignmentHistory>> getClientAssignmentHistory(
            @PathVariable Long clientId,
            @RequestParam(required = false) PortfolioActivityType activityType) {
        return ResponseEntity.ok(portfolioService.listClientHistory(clientId, activityType));
    }

    @PostMapping("{clientId}/commercial-assignments")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR + "')")
    public ResponseEntity<ClientCommercialAssignment> assignCommercial(
            @PathVariable Long clientId,
            @RequestBody AssignCommercialRequest request) {
        return ResponseEntity.ok(portfolioService.assignOrRelay(clientId, request.commercialUsername(),
                request.activityType(), request.primary(), request.handoverFromExisting(), request.reason()));
    }

    @PatchMapping("{clientId}/commercial-assignments/{assignmentId}/status")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR + "')")
    public ResponseEntity<ClientCommercialAssignment> changeAssignmentStatus(
            @PathVariable Long clientId,
            @PathVariable Long assignmentId,
            @RequestBody ChangeStatusRequest request) {
        return ResponseEntity.ok(portfolioService.changeStatus(assignmentId, request.status(), request.primary(),
                request.reason()));
    }

    @PostMapping("commercial-assignments/bulk-preview")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR + "')")
    public ResponseEntity<BulkPortfolioPreviewDto> previewBulk(@RequestBody BulkPortfolioOperationDto dto) {
        return ResponseEntity.ok(portfolioService.previewBulkOperation(dto));
    }

    @PostMapping("commercial-assignments/bulk-execute")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR + "')")
    public ResponseEntity<BulkPortfolioPreviewDto> executeBulk(@RequestBody BulkPortfolioOperationDto dto) {
        return ResponseEntity.ok(portfolioService.executeBulkOperation(dto));
    }

    public record AssignCommercialRequest(String commercialUsername, PortfolioActivityType activityType,
                                          boolean primary, boolean handoverFromExisting, String reason) {
    }

    public record ChangeStatusRequest(CommercialAssignmentStatus status, Boolean primary, String reason) {
    }
}
