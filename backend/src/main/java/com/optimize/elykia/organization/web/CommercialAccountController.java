package com.optimize.elykia.organization.web;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.organization.web.dto.CommercialAssignmentWriteDto;
import com.optimize.elykia.organization.application.CommercialAccountAssignmentService;
import com.optimize.elykia.shared.security.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/commercial-accounts")
@CrossOrigin
@PreAuthorize("hasAuthority('" + UserPermissionConstant.MANAGE_COMMERCIAL_STAFF + "')")
public class CommercialAccountController {

    private final CommercialAccountAssignmentService assignmentService;

    @GetMapping
    public ResponseEntity<Response> list() {
        return ResponseEntity.ok(ResponseUtil.successResponse(assignmentService.listAccounts()));
    }

    @GetMapping("{userId}/assignments")
    public ResponseEntity<Response> history(@PathVariable Long userId) {
        return ResponseEntity.ok(ResponseUtil.successResponse(assignmentService.history(userId)));
    }

    @PostMapping("{userId}/assignments")
    public ResponseEntity<Response> create(@PathVariable Long userId, @RequestBody CommercialAssignmentWriteDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(assignmentService.create(userId, dto)), HttpStatus.CREATED);
    }

    @PutMapping("assignments/{id}")
    public ResponseEntity<Response> update(@PathVariable Long id, @RequestBody CommercialAssignmentWriteDto dto) {
        return ResponseEntity.ok(ResponseUtil.successResponse(assignmentService.update(id, dto)));
    }

    @DeleteMapping("assignments/{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        assignmentService.delete(id);
        return ResponseEntity.ok(ResponseUtil.successResponse(true));
    }
}
