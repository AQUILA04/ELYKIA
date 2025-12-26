package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.ArticleTypeDto;
import com.optimize.elykia.core.service.ArticleTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/article-types")
@RequiredArgsConstructor
@Tag(name = "Article Type", description = "Management of article types")
public class ArticleTypeController {

    private final ArticleTypeService articleTypeService;

    @PostMapping
    @Operation(summary = "Create a new article type")
    public ResponseEntity<Response> create(@RequestBody ArticleTypeDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articleTypeService.createArticleType(dto)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing article type")
    public ResponseEntity<Response> update(@PathVariable Long id, @RequestBody ArticleTypeDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articleTypeService.updateArticleType(dto, id)), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an article type")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articleTypeService.deleteSoft(id)), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an article type by ID")
    public ResponseEntity<Response> get(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articleTypeService.getById(id)), HttpStatus.OK);
    }

    @GetMapping
    @Operation(summary = "List article types with pagination")
    public ResponseEntity<Response> list(Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articleTypeService.getAll(pageable)), HttpStatus.OK);
    }
    
    @GetMapping("/all")
    @Operation(summary = "Get all article types without pagination")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articleTypeService.getAll()), HttpStatus.OK);
    }
}
