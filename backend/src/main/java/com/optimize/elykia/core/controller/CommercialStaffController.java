package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.commercial.CommercialStaffDetailDto;
import com.optimize.elykia.core.dto.commercial.CommercialStaffDto;
import com.optimize.elykia.core.dto.commercial.CommercialStaffWriteDto;
import com.optimize.elykia.core.entity.Promoter;
import com.optimize.elykia.core.service.commercial.CommercialAccountAssignmentService;
import com.optimize.elykia.core.service.commercial.CommercialStaffPhotoService;
import com.optimize.elykia.core.service.commercial.CommercialStaffService;
import com.optimize.elykia.core.service.store.ArticlePhotoBytes;
import com.optimize.elykia.shared.security.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/commercial-staff")
@CrossOrigin
@PreAuthorize("hasAuthority('" + UserPermissionConstant.MANAGE_COMMERCIAL_STAFF + "')")
public class CommercialStaffController {

    private final CommercialStaffService staffService;
    private final CommercialStaffPhotoService photoService;
    private final CommercialAccountAssignmentService assignmentService;

    @GetMapping
    public ResponseEntity<Response> list() {
        return ResponseEntity.ok(ResponseUtil.successResponse(staffService.list()));
    }

    @GetMapping("{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        CommercialStaffDto person = staffService.get(id);
        CommercialStaffDetailDto detail = new CommercialStaffDetailDto(person, assignmentService.historyForPerson(id));
        return ResponseEntity.ok(ResponseUtil.successResponse(detail));
    }

    @PostMapping
    public ResponseEntity<Response> create(@RequestBody CommercialStaffWriteDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(staffService.create(dto)), HttpStatus.CREATED);
    }

    @PutMapping("{id}")
    public ResponseEntity<Response> update(@PathVariable Long id, @RequestBody CommercialStaffWriteDto dto) {
        return ResponseEntity.ok(ResponseUtil.successResponse(staffService.update(id, dto)));
    }

    @DeleteMapping("{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        staffService.delete(id);
        return ResponseEntity.ok(ResponseUtil.successResponse(true));
    }

    @PostMapping(value = "{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response> uploadPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        Promoter person = photoService.upload(id, ArticlePhotoBytes.read(file));
        return ResponseEntity.ok(ResponseUtil.successResponse(staffService.toDto(person)));
    }

    @DeleteMapping("{id}/photo")
    public ResponseEntity<Response> deletePhoto(@PathVariable Long id) {
        Promoter person = photoService.delete(id);
        return ResponseEntity.ok(ResponseUtil.successResponse(staffService.toDto(person)));
    }
}
