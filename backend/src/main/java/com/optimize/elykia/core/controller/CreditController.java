package com.optimize.elykia.core.controller;

import com.lowagie.text.DocumentException;
import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.dto.CreditSummaryDto;
import com.optimize.elykia.core.dto.MergeCreditDto;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.repository.spec.CreditSpecification;
import com.optimize.elykia.core.service.CreditArticlesService;
import com.optimize.elykia.core.service.CreditReturnHistoryService;
import com.optimize.elykia.core.service.CreditService;
import com.optimize.elykia.core.service.CreditTimelineService;
import com.optimize.elykia.core.service.PdfService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/credits")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de gestion des crédits")
@CrossOrigin
public class CreditController {

    private final CreditService creditService;
    private final CreditTimelineService creditTimelineService;
    private final PdfService pdfService;
    private final CreditReturnHistoryService creditReturnHistoryService;
    private final CreditArticlesService creditArticlesService;

    @PostMapping
    public ResponseEntity<Response> createCredit(@RequestBody @Valid CreditDto dto) throws Exception {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.createCredit(dto)), HttpStatus.CREATED);
    }

    @PostMapping("/fetch")
    public ResponseEntity<Response> fetch(@RequestBody CreditSearchDto dto, Pageable pageable) {
        Page<Credit> page = creditService.getRepository().findAll(CreditSpecification.build(dto), pageable);
        Page<CreditRespDto> pageDto = new PageImpl<>(page.getContent()
                .stream()
                .map(CreditRespDto::fromCredit).toList(),
                pageable, page.getTotalElements());
        return new ResponseEntity<>(ResponseUtil.successResponse(pageDto), HttpStatus.OK);
    }

    @PostMapping(value = "create-tontine")
    public ResponseEntity<Response> createTontine(@RequestBody @Valid CreditDto dto) throws Exception {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.createTontineForCommercial(dto)), HttpStatus.CREATED);
    }

    @PutMapping(value = "{id}")
    public ResponseEntity<Response> updateCredit(@RequestBody CreditDto dto, @PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.updateCredit(dto, id)), HttpStatus.OK);
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getById(id)), HttpStatus.OK);
    }

    @GetMapping(value = "with-distributions/{id}")
    public ResponseEntity<Response> getCreditWithDistribution(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditWithDistribution(id)), HttpStatus.OK);
    }

    @GetMapping(value = "back-to-store/{creditId}")
    public ResponseEntity<Response> getBackToStoreArticles(@PathVariable Long creditId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getBackToStoreArticles(creditId)), HttpStatus.OK);
    }

    @GetMapping(value = "timeline/{creditId}")
    public ResponseEntity<Response> getCreditDetails(@PathVariable Long creditId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditTimelineService.getAllByCredit(creditId)), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Response> getAll(Pageable pageable,
                                           @RequestParam(name = "search", required = false, defaultValue = "") String searchTerm) {
        Sort sort = Sort.by(Sort.Direction.DESC, "id");
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);

        // On passe le searchTerm au service
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getAll(pageable, searchTerm)), HttpStatus.OK);
    }

    @GetMapping(value = "validated")
    public ResponseEntity<Response> getAllValidated(String collector, Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getAllValidatedCredit(collector, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "history")
    public ResponseEntity<Response> getCreditHistories(Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditHistories(pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "return-history/{creditId}")
    public ResponseEntity<Response> getCreditReturnHistory(@PathVariable Long creditId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditReturnHistoryService.getHistoryByCreditId(creditId)), HttpStatus.OK);
    }

    @DeleteMapping(value = "{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.deleteSoft(id)), HttpStatus.OK);
    }

    @PostMapping(value = "daily-stake")
    public ResponseEntity<Response> dailyStake(@RequestBody @Valid CreditTimelineDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditTimelineService.makeDailyStake(dto)), HttpStatus.CREATED);
    }

    @GetMapping("/{id}/distribution-details")
    public ResponseEntity<Response> getCreditDistributionDetails(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditDistribution(id)), HttpStatus.OK);
    }

    @PatchMapping(value = "validate/{creditId}")
    public ResponseEntity<Response> validateCredit(@PathVariable Long creditId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.validateCredit(creditId)), HttpStatus.OK);
    }

    @PatchMapping(value = "back-to-store")
    public ResponseEntity<Response> backToStore(@RequestBody @Valid ReturnArticlesDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.backToStore(dto)), HttpStatus.OK);
    }

    @PatchMapping(value = "distribute-articles")
    public ResponseEntity<Response> distributeArticle(@RequestBody @Valid DistributeArticleDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.distributeArticlesV2(dto)), HttpStatus.OK);
    }

    @PatchMapping(value = "start/{creditId}")
    public ResponseEntity<Response> startCredit(@PathVariable Long creditId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.startCredit(creditId, Boolean.FALSE)), HttpStatus.OK);
    }

    @PatchMapping(value = "change-daily-stake")
    public ResponseEntity<Response> changeDailyStake(@RequestBody ChangeDailyStakeDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.changeDailyStake(dto)), HttpStatus.OK);
    }

    @PostMapping(value = "default-daily-stake")
    public ResponseEntity<Response> defaultDailyStake(@RequestBody @Valid CollectorDailyStakeDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditTimelineService.defaultDailyStakeByCollector(dto)), HttpStatus.CREATED);
    }

    @PostMapping(value = "special-daily-stake")
    public ResponseEntity<Response> specialDailyStake(@RequestBody @Valid SpecialDailyStakeDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditTimelineService.specialDailyStakeByCollector(dto)), HttpStatus.CREATED);
    }

    @PostMapping(value = "elasticsearch")
    public ResponseEntity<Response> elasticSearch(@RequestBody ElasticSearchWrapper wrapper, Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.elasticsearch(wrapper.getKeyword(), pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "by-collector")
    public ResponseEntity<Response> getAllByCollector(Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditByCollector(pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "by-commercial/{collector}")
    public ResponseEntity<Response> getAllByCollectors(@PathVariable String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditByCollectors(collector, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "history/by-commercial/{collector}")
    public ResponseEntity<Response> getAllHistoryByCollectors(@PathVariable String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditHistoryByCollectors(collector, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "ending/by-commercial/{collector}")
    public ResponseEntity<Response> getEndingByCollectors(@PathVariable String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getEndingCreditsByCommercial(collector, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "delayed/by-commercial/{collector}")
    public ResponseEntity<Response> getDelayedByCollectors(@PathVariable String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getDelayedCreditsByCommercial(collector, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "sorties/by-commercial/{collector}")
    public ResponseEntity<Response> getAllPendingSortiesByCollectors(@PathVariable String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getPendingSortieByCollectors(collector, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "sorties-history/by-commercial/{collector}")
    public ResponseEntity<Response> getAllSortieHistory(@PathVariable String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getsortiesByCollector(collector, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "stock-output/by-commercial/{collector}")
    public ResponseEntity<Response> getCommercialStockOutput(@PathVariable String collector) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCommercialStockOutput(collector)), HttpStatus.OK);
    }

    @GetMapping(value = "by-collector/all")
    public ResponseEntity<Response> getAllByCollector() {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditByCollector()), HttpStatus.OK);
    }

    @GetMapping(value = "by-collector/all-grouped")
    public ResponseEntity<Response> getAllByCollectorV2() {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditByCollectorV2()), HttpStatus.OK);
    }
    @GetMapping(value = "article-quantity-distributed")
    public ResponseEntity<Response> getTotalDistributed(Long creditId, Long articleId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getTotalDistributed(creditId, articleId)), HttpStatus.OK);
    }

    @GetMapping(value = "item-release-sheet/pdf/{username}" )
    public Resource generateItemReleaseSheetPdf(@PathVariable String username) throws DocumentException {
        return new InputStreamResource(pdfService.printItemReleaseSheetPdf(username, null));
    }

    @GetMapping(value = "item-release-sheet/pdf/current-date" )
    public ResponseEntity<Response> generateItemReleaseSheetPdf() throws DocumentException {
        return new ResponseEntity<>(ResponseUtil.successResponse(pdfService.generateItemReleasePDfForCurrentDate()), HttpStatus.OK);
    }


    @GetMapping(value = "commercial-details/{id}")
    public ResponseEntity<Response> getCommercialDetails(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCommercialDetails(id)), HttpStatus.OK);
    }

    @GetMapping(value = "client-details/{clientId}")
    public ResponseEntity<Response> getClientDetails(@PathVariable Long clientId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getClientDetails(clientId)), HttpStatus.OK);
    }

    @GetMapping(value = "by-client/{clientId}")
    public ResponseEntity<Response> getCreditsByClient(@PathVariable Long clientId, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditsByClientAndStatus(clientId, CreditStatus.INPROGRESS, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "{creditId}/distributions")
    public ResponseEntity<Response> getDistributions(@PathVariable Long creditId, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getDistributions(creditId, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "{creditId}/timelines")
    public ResponseEntity<Response> getTimelines(@PathVariable Long creditId, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getTimelines(creditId, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "timelines/by-client/{clientId}")
    public ResponseEntity<Response> getTimelinesByClient(@PathVariable Long clientId, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getTimelinesByClient(clientId, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "history/by-client/{clientId}")
    public ResponseEntity<Response> getCreditsHistoryByClient(@PathVariable Long clientId, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditsByClientAndStatus(clientId, CreditStatus.SETTLED, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "pending/by-client/{clientId}")
    public ResponseEntity<Response> getPendingCreditsByClient(@PathVariable Long clientId, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return new ResponseEntity<>(ResponseUtil.successResponse(creditService.getCreditsByClientAndStatusIn(clientId, List.of(CreditStatus.CREATED, CreditStatus.VALIDATED), pageable)), HttpStatus.OK);
    }


    @GetMapping("/summary/total-disbursed")
    public ResponseEntity<Response> getTotalDisbursed(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        //la méthode du service
        Double totalAmount = creditService.getTotalDisbursedAmountForPeriod(startDate, endDate);

        // Retourne la réponse
        return new ResponseEntity<>(ResponseUtil.successResponse(totalAmount), HttpStatus.OK);
    }

    @GetMapping("/mergeable/{commercialUsername}")
    public ResponseEntity<Response> getMergeableCredits(@PathVariable String commercialUsername) {
        return new ResponseEntity<>(ResponseUtil.successResponse(
            creditService.getMergeableCreditsByCommercial(commercialUsername)), HttpStatus.OK);
    }

    @PostMapping("/merge")
    public ResponseEntity<Response> mergeCredits(@RequestBody @Valid MergeCreditDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(
            creditService.mergeCredits(dto)), HttpStatus.OK);
    }

    @GetMapping(value = "{creditId}/articles")
    public ResponseEntity<Response> getCreditArticles(@PathVariable Long creditId) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditArticlesService.getRepository().findByCredit_id(creditId)), HttpStatus.OK);
    }
}
