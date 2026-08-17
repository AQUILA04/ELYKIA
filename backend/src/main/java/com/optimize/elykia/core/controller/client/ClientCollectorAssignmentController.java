package com.optimize.elykia.core.controller.client;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.client.dto.BulkAssignCollectorsDto;
import com.optimize.elykia.core.service.client.ClientCollectorAssignmentService;
import jakarta.validation.Valid;
import com.optimize.elykia.core.util.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/clients")
@CrossOrigin
public class ClientCollectorAssignmentController {

    private final ClientCollectorAssignmentService clientCollectorAssignmentService;

    @PostMapping("bulk-assign-collectors")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR + "')")
    public ResponseEntity<Response> bulkAssignCollectors(@RequestBody @Valid BulkAssignCollectorsDto dto) {
        clientCollectorAssignmentService.bulkAssignCollectors(dto);
        return new ResponseEntity<>(ResponseUtil.successResponse(true), HttpStatus.OK);
    }
}
