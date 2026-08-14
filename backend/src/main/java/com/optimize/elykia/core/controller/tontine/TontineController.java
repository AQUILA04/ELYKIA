package com.optimize.elykia.core.controller.tontine;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.core.dto.CreateTontineMemberFieldControlDto;
import com.optimize.elykia.core.dto.TontineCollectionDto;
import com.optimize.elykia.core.dto.TontineCatchupPreviewDto;
import com.optimize.elykia.core.dto.TontineMemberDto;
import com.optimize.elykia.core.dto.TontineMemberRespDto;
import com.optimize.elykia.core.dto.TontineSessionUpdateDto;
import com.optimize.elykia.core.util.UserPermissionConstant;
import com.optimize.elykia.core.service.sale.CreditArticlesService;
import com.optimize.elykia.core.service.stock.StockExportService;
import com.optimize.elykia.core.service.tontine.TontineExportService;
import com.optimize.elykia.core.service.tontine.TontineMemberFieldControlService;
import com.optimize.elykia.core.service.tontine.TontineMemberContributionService;
import com.optimize.elykia.core.service.tontine.TontineService;
import com.optimize.elykia.core.service.tontine.TontineStockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Set;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/tontines")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des tontines")
@CrossOrigin
public class TontineController {

    private final TontineService tontineService;
    private final TontineStockService tontineStockService;
    private final TontineMemberFieldControlService tontineMemberFieldControlService;
    private final CreditArticlesService creditArticlesService;
    private final StockExportService stockExportService;
    private final TontineExportService tontineExportService;
    private final TontineMemberContributionService tontineMemberContributionService;

    @GetMapping("/sessions/current")
    public ResponseEntity<Response> getCurrentSession() {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.getActiveSession()), HttpStatus.OK);
    }

    @PutMapping("/sessions/current")
    public ResponseEntity<Response> updateCurrentSession(@RequestBody @Valid TontineSessionUpdateDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.updateCurrentSession(dto)),
                HttpStatus.OK);
    }

    @PostMapping("/sessions/current/close")
    public ResponseEntity<Response> closeCurrentSession() {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.closeCurrentSession()),
                HttpStatus.OK);
    }

    @PostMapping("/sessions/current/reopen")
    public ResponseEntity<Response> reopenCurrentSession() {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.reopenCurrentSessionForE2e()),
                HttpStatus.OK);
    }

    @GetMapping("/allocation-migration/status")
    @Operation(summary = "Statut du recalcul des parts société (migration V1/V2)")
    public ResponseEntity<Response> getAllocationMigrationStatus() {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(tontineService.getAllocationMigrationStatus()), HttpStatus.OK);
    }

    @PostMapping("/sessions/current/recalculate-allocations")
    @PreAuthorize("hasAnyRole('" + UserPermissionConstant.ADMIN + "')")
    @Operation(summary = "Relancer manuellement le recalcul des allocations tontine")
    public ResponseEntity<Response> recalculateAllocations() {
        String username = tontineService.getUserService().getCurrentUser().getUsername();
        return new ResponseEntity<>(
                ResponseUtil.successResponse(tontineService.triggerAllocationRecalculation(username)),
                HttpStatus.OK);
    }

    @PostMapping("/members")
    public ResponseEntity<Response> registerMember(@RequestBody @Valid TontineMemberDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.registerMember(dto)),
                HttpStatus.CREATED);
    }

    @PostMapping("/members/add-list")
    public ResponseEntity<Response> registerMembers(@RequestBody @Valid Set<TontineMemberDto> dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.registerMembers(dto)),
                HttpStatus.CREATED);
    }

    @GetMapping("/members")
    public ResponseEntity<Response> getMembersForCommercial(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String commercial,
            @RequestParam(required = false) String deliveryStatus) {
        User user = tontineService.getUserService().getCurrentUser();
        return new ResponseEntity<>(ResponseUtil.successResponse(
                tontineService.getMembers(user, search, deliveryStatus, commercial, pageable)), HttpStatus.OK);
    }

    @GetMapping("/members/history")
    public ResponseEntity<Response> getMembersHistory(
            @RequestParam(required = false) String commercial) {
        return new ResponseEntity<>(ResponseUtil.successResponse(
                tontineService.getMembersHistory(commercial)), HttpStatus.OK);
    }

    @GetMapping("/members/history/page")
    public ResponseEntity<Response> getMembersHistoryPage(
            Pageable pageable,
            @RequestParam(required = false) String commercial) {
        return new ResponseEntity<>(ResponseUtil.successResponse(
                tontineService.getMembersHistoryPage(commercial, pageable)), HttpStatus.OK);
    }

    @GetMapping("/members/export/pdf")
    @PreAuthorize("hasAnyRole('" + UserPermissionConstant.TONTINE_MEMBER_PDF + "', '" + UserPermissionConstant.ADMIN + "')")
    @Operation(summary = "Exporter en PDF les membres d'un commercial (session en cours)")
    public ResponseEntity<byte[]> exportCommercialMembersPdf(@RequestParam String commercial) {
        byte[] pdfContent = tontineExportService.exportCommercialMembersPdf(commercial);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String safeCommercial = commercial.replaceAll("[^a-zA-Z0-9_-]", "_");
        headers.setContentDispositionFormData("attachment",
                "membres_tontine_" + safeCommercial + "_" + LocalDate.now() + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        return new ResponseEntity<>(pdfContent, headers, HttpStatus.OK);
    }

    @GetMapping("/members/{id}")
    public ResponseEntity<Response> getMemberById(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(
                TontineMemberRespDto.fromTontineMember(tontineService.getById(id))), HttpStatus.OK);
    }

    @GetMapping("/members/{id}/contributions-by-commercial")
    @Operation(summary = "Répartition des cotisations d'un membre par commercial collecteur")
    public ResponseEntity<Response> getMemberContributionsByCommercial(@PathVariable Long id) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(tontineMemberContributionService.getByMember(id)),
                HttpStatus.OK);
    }

    @GetMapping("/members/{id}/export/pdf")
    @PreAuthorize("hasAnyRole('" + UserPermissionConstant.TONTINE_MEMBER_PDF + "', '" + UserPermissionConstant.ADMIN + "')")
    @Operation(summary = "Exporter en PDF le détail des cotisations d'un membre")
    public ResponseEntity<byte[]> exportMemberDetailsPdf(@PathVariable Long id) {
        byte[] pdfContent = tontineExportService.exportMemberDetailsPdf(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment",
                "cotisations_membre_" + id + "_" + LocalDate.now() + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        return new ResponseEntity<>(pdfContent, headers, HttpStatus.OK);
    }

    @GetMapping("/members/{id}/amount-history")
    public ResponseEntity<Response> getMemberAmountHistory(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(
                tontineService.getMemberAmountHistory(id)), HttpStatus.OK);
    }

    @PostMapping("/members/{id}/field-controls")
    @PreAuthorize("hasAnyRole('RECOVERY_MANAGER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Response> createMemberFieldControl(
            @PathVariable Long id,
            @RequestBody @Valid CreateTontineMemberFieldControlDto dto) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(tontineMemberFieldControlService.create(id, dto)),
                HttpStatus.CREATED);
    }

    @GetMapping("/members/{id}/field-controls/latest")
    public ResponseEntity<Response> getLatestMemberFieldControl(@PathVariable Long id) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(tontineMemberFieldControlService.getLatest(id)),
                HttpStatus.OK);
    }

    @GetMapping("/members/{id}/field-controls")
    public ResponseEntity<Response> getMemberFieldControlHistory(@PathVariable Long id) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(tontineMemberFieldControlService.getHistory(id)),
                HttpStatus.OK);
    }

    @PutMapping("/members/{id}")
    public ResponseEntity<Response> updateMember(@PathVariable Long id, @RequestBody @Valid TontineMemberDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.updateMember(id, dto)), HttpStatus.OK);
    }

    @PostMapping("/collections")
    public ResponseEntity<Response> recordCollection(@RequestBody @Valid TontineCollectionDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.recordCollection(dto)),
                HttpStatus.CREATED);
    }

    @GetMapping("/members/{memberId}/catchup-preview")
    public ResponseEntity<Response> getCatchupPreview(
            @PathVariable Long memberId,
            @RequestParam LocalDate collectionDate) {
        TontineCatchupPreviewDto preview = tontineService.getCatchupPreview(memberId, collectionDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(preview), HttpStatus.OK);
    }

    @GetMapping("/collections")
    public ResponseEntity<Response> getCollection(Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.getCollections(pageable)),
                HttpStatus.OK);
    }

    @GetMapping("/members/{memberId}/collections")
    public ResponseEntity<Response> getCollectionHistory(@PathVariable Long memberId, Pageable pageable) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(
                        tontineService.getTontineCollectionRepository().findByTontineMember_IdAndState(memberId, com.optimize.common.entities.enums.State.ENABLED, pageable)),
                HttpStatus.OK);
    }

    @DeleteMapping("/collections/{id}")
    @PreAuthorize("hasAnyRole('" + UserPermissionConstant.CANCEL_TONTINE_COLLECTION + "', '" + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<Response> cancelCollection(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.cancelCollection(id)), HttpStatus.OK);
    }

    @GetMapping("/stock/items/{tontineItemId}/sales-details")
    public ResponseEntity<Response> getTontineStockSalesDetails(@PathVariable Long tontineItemId) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(creditArticlesService.getDetailsByTontineItemId(tontineItemId)),
                HttpStatus.OK);
    }

    @GetMapping("/stock/export/pdf")
    public ResponseEntity<byte[]> exportStockPdf(
            @RequestParam String commercial,
            @RequestParam Integer year) {

        byte[] pdfContent = stockExportService.generateTontineDashboardPdfExport(commercial, year);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = "rapport_stock_tontine_" + commercial + "_" + year + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new ResponseEntity<>(pdfContent, headers, HttpStatus.OK);
    }

    @GetMapping("/stock")
    public ResponseEntity<Response> getStock(
            @RequestParam(required = false) String commercial,
            @RequestParam(required = false) Boolean historic,
            Pageable pageable) {

        // Si pageable est présent (size/page), on retourne une Page
        // Sinon on garde le comportement liste pour compatibilité (si nécessaire, mais
        // ici on va migrer vers Page)
        // Spring Data Web Support injecte un Pageable par défaut si non fourni.

        return new ResponseEntity<>(
                ResponseUtil.successResponse(tontineStockService.getAll(commercial, pageable, historic)),
                HttpStatus.OK);
    }
}
