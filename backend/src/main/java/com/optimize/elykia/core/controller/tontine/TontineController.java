package com.optimize.elykia.core.controller.tontine;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.core.dto.TontineCollectionDto;
import com.optimize.elykia.core.dto.TontineMemberDto;
import com.optimize.elykia.core.dto.TontineSessionUpdateDto;
import com.optimize.elykia.core.service.tontine.TontineService;
import com.optimize.elykia.core.service.tontine.TontineStockService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/sessions/current")
    public ResponseEntity<Response> getCurrentSession() {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.getActiveSession()), HttpStatus.OK);
    }

    @PutMapping("/sessions/current")
    public ResponseEntity<Response> updateCurrentSession(@RequestBody @Valid TontineSessionUpdateDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.updateCurrentSession(dto)),
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

    @GetMapping("/members/{id}")
    public ResponseEntity<Response> getMemberById(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.getById(id)), HttpStatus.OK);
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

    @GetMapping("/collections")
    public ResponseEntity<Response> getCollection(Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(tontineService.getCollections(pageable)),
                HttpStatus.OK);
    }

    @GetMapping("/members/{memberId}/collections")
    public ResponseEntity<Response> getCollectionHistory(@PathVariable Long memberId, Pageable pageable) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(
                        tontineService.getTontineCollectionRepository().findByTontineMember_Id(memberId, pageable)),
                HttpStatus.OK);
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
