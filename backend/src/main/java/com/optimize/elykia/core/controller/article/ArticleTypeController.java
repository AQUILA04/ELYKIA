package com.optimize.elykia.core.controller.article;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.ArticleTypeDto;
import com.optimize.elykia.core.entity.article.ArticleType;
import com.optimize.elykia.core.service.store.ArticlePhotoBytes;
import com.optimize.elykia.core.service.store.ArticlePhotoService;
import com.optimize.elykia.core.service.store.ArticleTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/article-types")
@RequiredArgsConstructor
@Tag(name = "Article Type", description = "Management of article types")
public class ArticleTypeController {

    private final ArticleTypeService articleTypeService;
    private final ArticlePhotoService articlePhotoService;

    @PostMapping
    @Operation(summary = "Create a new article type")
    public ResponseEntity<Response> create(@RequestBody ArticleTypeDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(withPhoto(articleTypeService.createArticleType(dto))), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing article type")
    public ResponseEntity<Response> update(@PathVariable Long id, @RequestBody ArticleTypeDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(withPhoto(articleTypeService.updateArticleType(dto, id))), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an article type")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articleTypeService.deleteSoft(id)), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an article type by ID")
    public ResponseEntity<Response> get(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(withPhoto(articleTypeService.getById(id))), HttpStatus.OK);
    }

    @GetMapping
    @Operation(summary = "List article types with pagination")
    public ResponseEntity<Response> list(Pageable pageable) {
        Page<ArticleType> page = articleTypeService.getAll(pageable);
        articlePhotoService.attachTypeUrls(page.getContent());
        return new ResponseEntity<Response>(ResponseUtil.successResponse(page), HttpStatus.OK);
    }
    
    @GetMapping("/all")
    @Operation(summary = "Get all article types without pagination")
    public ResponseEntity<Response> getAll() {
        List<ArticleType> types = articleTypeService.getAll();
        articlePhotoService.attachTypeUrls(types);
        return new ResponseEntity<Response>(ResponseUtil.successResponse(types), HttpStatus.OK);
    }

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Enregistre la photo réduite d'un type d'article")
    public ResponseEntity<Response> uploadPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return new ResponseEntity<>(ResponseUtil.successResponse(withPhoto(articlePhotoService.uploadType(id, ArticlePhotoBytes.read(file)))), HttpStatus.OK);
    }

    @DeleteMapping("/{id}/photo")
    @Operation(summary = "Retire la photo d'un type d'article")
    public ResponseEntity<Response> deletePhoto(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(withPhoto(articlePhotoService.deleteType(id))), HttpStatus.OK);
    }

    private ArticleType withPhoto(ArticleType type) {
        articlePhotoService.attachTypeUrls(type == null ? List.of() : List.of(type));
        return type;
    }
}
