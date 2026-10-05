package com.optimize.elykia.core.controller.customer;

import com.optimize.elykia.core.dto.customer.*;
import com.optimize.elykia.core.service.customer.CustomerContextService;
import com.optimize.elykia.core.service.customer.CustomerNotificationService;
import com.optimize.elykia.core.service.customer.CustomerOnboardingService;
import com.optimize.elykia.core.service.customer.CustomerPortalService;
import com.optimize.elykia.core.service.customer.PaymentProofService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@CrossOrigin
@PreAuthorize("hasRole('ROLE_CLIENT')")
public class CustomerApiController {

    private final CustomerPortalService customerPortalService;
    private final CustomerOnboardingService customerOnboardingService;
    private final CustomerNotificationService customerNotificationService;
    private final PaymentProofService paymentProofService;
    private final CustomerContextService customerContextService;

    @GetMapping("/dashboard")
    public ResponseEntity<CustomerDashboardDto> getDashboard() {
        return ResponseEntity.ok(customerPortalService.getDashboard());
    }

    @GetMapping("/purchases")
    public ResponseEntity<List<CustomerPurchaseDto>> getPurchases() {
        return ResponseEntity.ok(customerPortalService.getPurchases());
    }

    @GetMapping("/purchases/{id}")
    public ResponseEntity<CustomerPurchaseDto> getPurchase(@PathVariable Long id) {
        return ResponseEntity.ok(customerPortalService.getPurchase(id));
    }

    @GetMapping("/purchases/{id}/recoveries")
    public ResponseEntity<List<CustomerRecoveryDto>> getRecoveries(@PathVariable Long id) {
        return ResponseEntity.ok(customerPortalService.getRecoveries(id));
    }

    @GetMapping("/tontine/contributions")
    public ResponseEntity<List<CustomerTontineContributionSummaryDto>> getTontineContributions() {
        return ResponseEntity.ok(customerPortalService.getTontineContributions());
    }

    @GetMapping("/tontine/session/current")
    public ResponseEntity<CustomerTontineSessionDto> getCurrentTontineSession() {
        return ResponseEntity.ok(customerPortalService.getCurrentTontineSession());
    }

    @GetMapping("/tontine/mobile-money-recipients")
    public ResponseEntity<CustomerMobileMoneyRecipientDto> getTontineJoinRecipients() {
        return ResponseEntity.ok(customerPortalService.getTontineJoinRecipients());
    }

    @PostMapping("/tontine/join")
    public ResponseEntity<CustomerTontineJoinResponse> joinTontineSession(
            @Valid @RequestBody CustomerTontineJoinRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerPortalService.joinTontineSession(request));
    }

    @GetMapping("/tontine/contributions/{memberId}")
    public ResponseEntity<CustomerTontineContributionDetailDto> getTontineContribution(
            @PathVariable Long memberId) {
        return ResponseEntity.ok(customerPortalService.getTontineContribution(memberId));
    }

    @GetMapping("/tontine/contributions/{memberId}/payments")
    public ResponseEntity<CustomerTontinePaymentPageDto> getTontineContributionPayments(
            @PathVariable Long memberId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(customerPortalService.getTontinePayments(memberId, page, size));
    }

    @GetMapping("/tontine/contributions/{memberId}/mobile-money-recipients")
    public ResponseEntity<CustomerMobileMoneyRecipientDto> getTontineMobileMoneyRecipients(
            @PathVariable Long memberId) {
        return ResponseEntity.ok(customerPortalService.getTontineMobileMoneyRecipients(memberId));
    }

    @PostMapping("/tontine/contributions/{memberId}/mobile-money")
    public ResponseEntity<CustomerTontinePaymentDto> submitTontineMobileMoney(
            @PathVariable Long memberId,
            @Valid @RequestBody CustomerTontineMobileMoneyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerPortalService.submitTontineMobileMoney(memberId, request));
    }

    @GetMapping("/purchases/{id}/mobile-money-recipients")
    public ResponseEntity<CustomerMobileMoneyRecipientDto> getMobileMoneyRecipients(@PathVariable Long id) {
        return ResponseEntity.ok(customerPortalService.getMobileMoneyRecipients(id));
    }

    @PostMapping("/recoveries/mobile-money")
    public ResponseEntity<CustomerRecoveryDto> submitMobileMoney(@Valid @RequestBody CustomerMobileMoneyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerPortalService.submitMobileMoney(request));
    }

    @PostMapping(value = "/payment-proofs", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomerPaymentProofDto> uploadPaymentProof(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) Long replacesProofId) {
        Long clientId = customerContextService.requireClient(customerContextService.currentUsername()).getId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentProofService.upload(clientId, file, replacesProofId));
    }

    @DeleteMapping("/payment-proofs/{id}")
    public ResponseEntity<Void> deletePaymentProof(@PathVariable Long id) {
        Long clientId = customerContextService.requireClient(customerContextService.currentUsername()).getId();
        paymentProofService.deleteUnlinkedOwned(clientId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/articles/top-types")
    public ResponseEntity<List<CustomerArticleTypeDto>> getTopArticleTypes(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(customerPortalService.getTopArticleTypes(limit));
    }

    @GetMapping("/articles")
    public ResponseEntity<List<CustomerArticleDto>> getArticles(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(customerPortalService.getArticles(search, category));
    }

    @PostMapping("/orders")
    public ResponseEntity<CustomerOrderResponse> submitOrder(@Valid @RequestBody CustomerOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerPortalService.submitOrder(request));
    }

    @GetMapping("/onboarding/status")
    public ResponseEntity<CustomerOnboardingStatusDto> getOnboardingStatus() {
        return ResponseEntity.ok(customerOnboardingService.getStatus());
    }

    @PostMapping("/onboarding/id-document")
    public ResponseEntity<CustomerOnboardingStatusDto> uploadIdDocument(
            @Valid @RequestBody CustomerIdDocumentRequest request) {
        return ResponseEntity.ok(customerOnboardingService.uploadIdDocument(request));
    }

    @GetMapping("/onboarding/mobile-money-recipients")
    public ResponseEntity<CustomerMobileMoneyRecipientDto> getInitialDepositRecipients() {
        return ResponseEntity.ok(customerOnboardingService.getInitialDepositRecipients());
    }

    @PostMapping("/onboarding/initial-deposit")
    public ResponseEntity<CustomerInitialDepositDto> submitInitialDeposit(
            @Valid @RequestBody CustomerInitialDepositRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerOnboardingService.submitInitialDeposit(request));
    }

    @GetMapping("/onboarding/initial-deposit")
    public ResponseEntity<CustomerInitialDepositDto> getInitialDeposit() {
        return customerOnboardingService.getInitialDeposit()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<CustomerNotificationDto>> listNotifications(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(customerNotificationService.listMine(limit));
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> unreadNotificationCount() {
        return ResponseEntity.ok(Map.of("count", customerNotificationService.unreadCountMine()));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<CustomerNotificationDto> markNotificationRead(@PathVariable Long id) {
        return ResponseEntity.ok(customerNotificationService.markRead(id));
    }

    @PostMapping("/notifications/read-all")
    public ResponseEntity<Map<String, Integer>> markAllNotificationsRead() {
        return ResponseEntity.ok(Map.of("updated", customerNotificationService.markAllRead()));
    }
}
