package com.optimize.elykia.core.controller.article;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.ArticleListItemDto;
import com.optimize.elykia.core.dto.ArticleStockTrajectoryDto;
import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.dto.ElasticSearchWrapper;
import com.optimize.elykia.core.dto.StockEntryDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.service.store.ArticlePhotoService;
import com.optimize.elykia.core.service.store.ArticlePhotoView;
import com.optimize.elykia.core.service.store.ArticleStockTrajectoryService;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.sale.CreditArticlesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/articles")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de gestion des articles")
@CrossOrigin
public class ArticlesController {
    private final ArticlesService articlesService;
    private final CreditArticlesService creditArticlesService;
    private final ArticleStockTrajectoryService trajectoryService;
    private final ArticlePhotoService articlePhotoService;

    @PostMapping
    public ResponseEntity<Response> createArticle(@RequestBody @Valid ArticlesDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articlesService.createArticles(dto)),
                HttpStatus.CREATED);
    }

    @PostMapping("/reset-stock")
    public ResponseEntity<Response> resetStock() {
        articlesService.resetAllStockQuantities();
        return new ResponseEntity<>(
                ResponseUtil.successResponse("Toutes les quantités en stock ont été réinitialisées à zéro."),
                HttpStatus.OK);
    }

    // AJOUTEZ CET ENDPOINT
    @PostMapping("/{id}/reset-stock")
    public ResponseEntity<Response> resetStockForSingleArticle(@PathVariable Long id) {
        articlesService.resetStockForArticle(id);
        return new ResponseEntity<>(
                ResponseUtil.successResponse("La quantité en stock de l'article a été réinitialisée."), HttpStatus.OK);
    }

    @PutMapping(value = "{id}")
    public ResponseEntity<Response> updateArticle(@RequestBody @Valid ArticlesDto dto, @PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articlesService.updateArticles(dto, id)),
                HttpStatus.OK);
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        Articles article = articlesService.getById(id);
        articlePhotoService.attachArticleUrls(article);
        return new ResponseEntity<Response>(ResponseUtil.successResponse(article), HttpStatus.OK);
    }

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response> uploadPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        Articles article = articlePhotoService.uploadArticle(id, readPhoto(file));
        articlePhotoService.attachArticleUrls(article);
        return new ResponseEntity<>(ResponseUtil.successResponse(article), HttpStatus.OK);
    }

    @DeleteMapping(value = "/{id}/photo")
    public ResponseEntity<Response> deletePhoto(@PathVariable Long id) {
        Articles article = articlePhotoService.deleteArticle(id);
        articlePhotoService.attachArticleUrls(article);
        return new ResponseEntity<>(ResponseUtil.successResponse(article), HttpStatus.OK);
    }

    @PatchMapping(value = "make-stock-entries")
    public ResponseEntity<Response> makeStockEntries(@RequestBody StockEntryDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articlesService.makeStockEntries(dto)),
                HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Response> getAll(Pageable pageable) {
        return new ResponseEntity<Response>(
                ResponseUtil.successResponse(withPhotos(articlesService.getAll(pageable))),
                HttpStatus.OK);
    }

    @GetMapping("/enabled")
    public ResponseEntity<Response> getAllEnabled(Pageable pageable) {
        return new ResponseEntity<Response>(
                ResponseUtil.successResponse(withPhotos(articlesService.getAllEnabled(pageable))),
                HttpStatus.OK);
    }

    @GetMapping("/enabled/all")
    public ResponseEntity<Response> getAllEnabledList() {
        return new ResponseEntity<Response>(
                ResponseUtil.successResponse(withPhotos(articlesService.getAllEnabledList())),
                HttpStatus.OK);
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<Response> disableArticle(@PathVariable Long id) {
        articlesService.disableArticle(id);
        return new ResponseEntity<>(ResponseUtil.successResponse("Article désactivé avec succès."), HttpStatus.OK);
    }

    @PostMapping("/{id}/enable")
    public ResponseEntity<Response> enableArticle(@PathVariable Long id) {
        articlesService.enableArticle(id);
        return new ResponseEntity<>(ResponseUtil.successResponse("Article activé avec succès."), HttpStatus.OK);
    }

    @PostMapping("/disable-batch")
    public ResponseEntity<Response> disableArticles(@RequestBody List<Long> ids) {
        articlesService.disableArticles(ids);
        return new ResponseEntity<>(ResponseUtil.successResponse("Articles désactivés avec succès."), HttpStatus.OK);
    }

    @PostMapping("/enable-batch")
    public ResponseEntity<Response> enableArticles(@RequestBody List<Long> ids) {
        articlesService.enableArticles(ids);
        return new ResponseEntity<>(ResponseUtil.successResponse("Articles activés avec succès."), HttpStatus.OK);
    }

    @GetMapping(value = "all")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<Response>(
                ResponseUtil.successResponse(withPhotos(articlesService.getAll())),
                HttpStatus.OK);
    }

    @DeleteMapping(value = "{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(articlesService.deleteSoft(id)),
                HttpStatus.OK);
    }

    @PostMapping(value = "elasticsearch")
    public ResponseEntity<Response> elasticSearch(@RequestBody ElasticSearchWrapper wrapper, Pageable pageable) {
        return new ResponseEntity<Response>(
                ResponseUtil.successResponse(
                        withPhotos(articlesService.elasticSearch(wrapper.getKeyword(), pageable))),
                HttpStatus.OK);
    }

    @PostMapping(value = "elasticsearch/enabled")
    public ResponseEntity<Response> elasticSearchEnabled(@RequestBody ElasticSearchWrapper wrapper, Pageable pageable) {
        return new ResponseEntity<Response>(
                ResponseUtil.successResponse(
                        withPhotos(articlesService.elasticSearchEnabled(wrapper.getKeyword(), pageable))),
                HttpStatus.OK);
    }

    @GetMapping(value = "out-of-stock")
    public ResponseEntity<Response> getAllOutOfTheStock(Pageable pageable) {
        return new ResponseEntity<Response>(
                ResponseUtil.successResponse(withPhotos(articlesService.getOutOfStock(pageable))),
                HttpStatus.OK);
    }

    @GetMapping(value = "next-out-of-stock")
    public ResponseEntity<Response> getNextOutOfTheStock(Pageable pageable) {
        return new ResponseEntity<Response>(
                ResponseUtil.successResponse(withPhotos(articlesService.getNextOutOfStock(pageable))),
                HttpStatus.OK);
    }

    @GetMapping(value = "top-ten-articles")
    public ResponseEntity<Response> getTopTenSellArticle() {
        return new ResponseEntity<Response>(
                ResponseUtil.successResponse(creditArticlesService.getTop10ArticlesWithHighestQuantity()),
                HttpStatus.OK);
    }

    @GetMapping("/detailed-stock-value")
    public ResponseEntity<Map<String, Double>> getDetailedStockValues() {
        Map<String, Double> totals = articlesService.getDetailedStockValues();
        return ResponseEntity.ok(totals);
    }

    @GetMapping("/stock-kpis")
    public ResponseEntity<Map<String, Object>> getStockKpis() {
        return ResponseEntity.ok(articlesService.getArticleStockKpis());
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<Response> getArticleHistory(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(
                articlesService.getArticleHistoryService().getByArticleId(id)), HttpStatus.OK);
    }

    @GetMapping("/{id}/trajectory")
    @PreAuthorize("hasRole('ROLE_CONSULT_INVENTORY_HISTORY')")
    @Operation(summary = "Trajectoire stock depuis un inventaire jusqu'à une date T")
    public ResponseEntity<Response> getArticleTrajectory(
            @PathVariable Long id,
            @RequestParam Long fromInventoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        ArticleStockTrajectoryDto trajectory = trajectoryService.getTrajectoryFromArticle(id, fromInventoryId, toDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(trajectory), HttpStatus.OK);
    }

    @GetMapping("/{id}/state-history")
    public ResponseEntity<Response> getArticleStateHistory(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(
                articlesService.getStateHistoryByArticleId(id)), HttpStatus.OK);
    }

    @GetMapping("/{id}/price-history")
    public ResponseEntity<Response> getArticlePriceHistory(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(
                articlesService.getPriceHistoryByArticleId(id)), HttpStatus.OK);
    }

    private Page<ArticleListItemDto> withPhotos(Page<Articles> page) {
        Map<Long, ArticlePhotoView> views = articlePhotoService.viewForArticles(page.getContent());
        return ArticleListItemDto.fromPage(page, views);
    }

    private List<ArticleListItemDto> withPhotos(List<Articles> articles) {
        return ArticleListItemDto.fromList(articles, articlePhotoService.viewForArticles(articles));
    }

    private static byte[] readPhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomValidationException("La photo est vide.");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new CustomValidationException("La photo n'a pas pu être lue.");
        }
    }
}
