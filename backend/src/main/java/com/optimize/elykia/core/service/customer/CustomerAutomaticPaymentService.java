package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.Parameter;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.customer.CustomerAutomaticPaymentDto;
import com.optimize.elykia.core.dto.customer.CustomerAutomaticPaymentRequest;
import com.optimize.elykia.core.dto.customer.PaymentCollectionOptionsDto;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.entity.customer.CustomerTontineMmSubmission;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.paygate.OptimizePaygateClient;
import com.optimize.elykia.core.paygate.OptimizePaygateClient.PaygatePaymentView;
import com.optimize.elykia.core.paygate.OptimizePaygateClient.PaygateQuote;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.customer.CustomerMobileMoneySubmissionRepository;
import com.optimize.elykia.core.repository.customer.CustomerTontineMmSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CustomerAutomaticPaymentService {

    private static final Logger log = LoggerFactory.getLogger(CustomerAutomaticPaymentService.class);

    static final String MODE_KEY = "CUSTOMER_PAYMENT_COLLECTION_MODE";
    static final String PURPOSE_CREDIT = "CREDIT";
    static final String PURPOSE_TONTINE = "TONTINE";

    private final ParameterService parameterService;
    private final WithdrawalFeeBracketService withdrawalFeeBracketService;
    private final OptimizePaygateClient paygateClient;
    private final CustomerContextService contextService;
    private final CustomerOnboardingService customerOnboardingService;
    private final CreditRepository creditRepository;
    private final TontineMemberRepository tontineMemberRepository;
    private final CustomerMobileMoneySubmissionRepository creditSubmissionRepository;
    private final CustomerTontineMmSubmissionRepository tontineSubmissionRepository;
    private final CustomerMobileMoneySubmissionAdminService creditAdminService;
    private final CustomerTontineMmSubmissionAdminService tontineAdminService;
    private final PlatformTransactionManager transactionManager;

    @Transactional(readOnly = true)
    public PaymentCollectionOptionsDto options(double amount) {
        long installment = toFrancs(amount);
        String mode = currentMode();
        List<PaymentCollectionOptionsDto.NetworkQuoteDto> networks = new ArrayList<>();
        if (!"MANUAL".equals(mode)) {
            networks.add(quoteNetwork("MIXX", "Mixx by Yas", installment));
            networks.add(quoteNetwork("FLOOZ", "Flooz", installment));
        }
        return PaymentCollectionOptionsDto.builder().mode(mode).networks(networks).build();
    }

    public void assertManualAllowed() {
        if ("AUTOMATIC".equals(currentMode())) {
            throw new CustomValidationException("La déclaration manuelle n'est pas activée.");
        }
    }

    @Transactional
    public CustomerAutomaticPaymentDto start(CustomerAutomaticPaymentRequest request) {
        assertAutomaticAllowed();
        String purpose = request.getPurpose().trim().toUpperCase(Locale.ROOT);
        if (PURPOSE_CREDIT.equals(purpose)) {
            return startCredit(request);
        }
        if (PURPOSE_TONTINE.equals(purpose)) {
            return startTontine(request.getMemberId(), request.getAmount(), request.getNetwork(), request.getPhone(), true);
        }
        throw new CustomValidationException("Type de paiement inconnu.");
    }

    @Transactional
    public CustomerAutomaticPaymentDto startTontine(Long memberId, Double amount, String network, String phone) {
        return startTontine(memberId, amount, network, phone, false);
    }

    private CustomerAutomaticPaymentDto startTontine(
            Long memberId, Double amount, String network, String phone, boolean isolated) {
        assertAutomaticAllowed();
        if (memberId == null) {
            throw new CustomValidationException("La cotisation tontine est introuvable.");
        }
        TontineMember member = requireOwnedMember(memberId);
        Client client = activeClient();
        long installment = toFrancs(amount);
        PreparedQuote quote = prepare(network, phone, installment);
        List<CustomerTontineMmSubmission> pending = tontineSubmissionRepository
                .findByTontineMemberIdAndStatusOrderByCreatedDateDesc(memberId, CustomerSubmissionStatus.EN_COURS);
        if (!pending.isEmpty()) {
            return refreshTontine(pending.get(0));
        }
        CustomerTontineMmSubmission submission = new CustomerTontineMmSubmission();
        submission.setClientId(client.getId());
        submission.setTontineMemberId(member.getId());
        submission.setExpectedAmount((double) installment);
        submission.setMobileMoneyAmount((double) installment);
        submission.setMobileMoneyPhone(quote.phone());
        submission.setMobileMoneyReference("AUTO");
        submission.setOperationDate(LocalDate.now());
        submission.setStatus(CustomerSubmissionStatus.EN_COURS);
        submission.setChannel("AUTOMATIC");
        submission.setNetwork(quote.network());
        submission.setWithdrawalFee((double) quote.withdrawalFee());
        submission.setCreatedBy(client.getFullName());
        submission = saveTontine(submission, isolated);
        return chargeTontine(submission, quote, "Cotisation tontine", isolated);
    }

    @Transactional
    public CustomerAutomaticPaymentDto refresh(String purpose, Long submissionId) {
        String normalized = purpose == null ? "" : purpose.trim().toUpperCase(Locale.ROOT);
        if (PURPOSE_CREDIT.equals(normalized)) {
            CustomerMobileMoneySubmission submission = creditSubmissionRepository.findById(submissionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable."));
            assertSameClient(submission.getClientId());
            return refreshCredit(submission);
        }
        if (PURPOSE_TONTINE.equals(normalized)) {
            CustomerTontineMmSubmission submission = tontineSubmissionRepository.findById(submissionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable."));
            assertSameClient(submission.getClientId());
            return refreshTontine(submission);
        }
        throw new CustomValidationException("Type de paiement inconnu.");
    }

    @Transactional
    public void applyCallback(String merchantReference, String paymentId, String status, String operatorReference) {
        if (!StringUtils.hasText(merchantReference) || !StringUtils.hasText(status)) {
            return;
        }
        if (merchantReference.startsWith("CREDIT-")) {
            Long id = parseId(merchantReference.substring("CREDIT-".length()));
            CustomerMobileMoneySubmission submission = creditSubmissionRepository.findById(id).orElse(null);
            if (submission == null || !Objects.equals(paymentId, submission.getPaygatePaymentId())) {
                return;
            }
            applyCreditStatus(submission, status, operatorReference);
            return;
        }
        if (merchantReference.startsWith("TONTINE-")) {
            Long id = parseId(merchantReference.substring("TONTINE-".length()));
            CustomerTontineMmSubmission submission = tontineSubmissionRepository.findById(id).orElse(null);
            if (submission == null || !Objects.equals(paymentId, submission.getPaygatePaymentId())) {
                return;
            }
            applyTontineStatus(submission, status, operatorReference);
        }
    }

    private CustomerAutomaticPaymentDto startCredit(CustomerAutomaticPaymentRequest request) {
        if (!StringUtils.hasText(request.getDistributionId()) || request.getInstallmentNumber() == null) {
            throw new CustomValidationException("L'échéance à payer est incomplète.");
        }
        long creditId = Long.parseLong(request.getDistributionId());
        Credit credit = requireOwnedCredit(creditId);
        Client client = activeClient();
        long installment = toFrancs(request.getAmount());
        PreparedQuote quote = prepare(request.getNetwork(), request.getPhone(), installment);
        for (CustomerMobileMoneySubmission pending : creditSubmissionRepository.findByCreditIdAndStatus(creditId, CustomerSubmissionStatus.EN_COURS)) {
            if (request.getInstallmentNumber().equals(pending.getInstallmentNumber())) {
                return refreshCredit(pending);
            }
        }
        CustomerMobileMoneySubmission submission = new CustomerMobileMoneySubmission();
        submission.setClientId(client.getId());
        submission.setCreditId(credit.getId());
        submission.setInstallmentNumber(request.getInstallmentNumber());
        submission.setExpectedAmount((double) installment);
        submission.setMobileMoneyAmount((double) installment);
        submission.setMobileMoneyPhone(quote.phone());
        submission.setMobileMoneyReference("AUTO");
        submission.setStatus(CustomerSubmissionStatus.EN_COURS);
        submission.setChannel("AUTOMATIC");
        submission.setNetwork(quote.network());
        submission.setWithdrawalFee((double) quote.withdrawalFee());
        submission.setCreatedBy(client.getFullName());
        submission = saveCredit(submission, true);
        return chargeCredit(submission, quote, "Mise crédit", true);
    }

    private CustomerAutomaticPaymentDto chargeCredit(
            CustomerMobileMoneySubmission submission, PreparedQuote quote, String description, boolean isolated) {
        PaygatePaymentView view = initiateOrFail(submission, quote, "CREDIT-" + submission.getId(), description, true, isolated);
        fillFromView(submission, view);
        saveCredit(submission, isolated);
        if (isolated) {
            try {
                inNewTransaction(() -> applyCreditStatus(submission, view.status(), view.operatorReference()));
            } catch (RuntimeException ex) {
                log.warn("Validation du paiement crédit {} reportée : {}", submission.getId(), ex.getMessage());
            }
            return toCreditDto(creditSubmissionRepository.findById(submission.getId()).orElse(submission));
        }
        return toCreditDto(applyCreditStatus(submission, view.status(), view.operatorReference()));
    }

    private CustomerAutomaticPaymentDto chargeTontine(
            CustomerTontineMmSubmission submission, PreparedQuote quote, String description, boolean isolated) {
        PaygatePaymentView view = initiateOrFail(submission, quote, "TONTINE-" + submission.getId(), description, false, isolated);
        fillTontine(submission, view);
        saveTontine(submission, isolated);
        if (isolated) {
            try {
                inNewTransaction(() -> applyTontineStatus(submission, view.status(), view.operatorReference()));
            } catch (RuntimeException ex) {
                log.warn("Validation du paiement tontine {} reportée : {}", submission.getId(), ex.getMessage());
            }
            return toTontineDto(tontineSubmissionRepository.findById(submission.getId()).orElse(submission));
        }
        return toTontineDto(applyTontineStatus(submission, view.status(), view.operatorReference()));
    }

    private PaygatePaymentView initiateOrFail(
            Object submission,
            PreparedQuote quote,
            String merchantReference,
            String description,
            boolean credit,
            boolean isolated) {
        try {
            return paygateClient.initiate(merchantReference, quote.network(), quote.phone(), quote.amountDue(), description);
        } catch (RuntimeException ex) {
            if (credit) {
                CustomerMobileMoneySubmission creditSubmission = (CustomerMobileMoneySubmission) submission;
                creditSubmission.setStatus(CustomerSubmissionStatus.ECHEC);
                saveCredit(creditSubmission, isolated);
            } else {
                CustomerTontineMmSubmission tontineSubmission = (CustomerTontineMmSubmission) submission;
                tontineSubmission.setStatus(CustomerSubmissionStatus.ECHEC);
                saveTontine(tontineSubmission, isolated);
            }
            throw ex;
        }
    }

    private CustomerMobileMoneySubmission saveCredit(CustomerMobileMoneySubmission submission, boolean isolated) {
        if (isolated) {
            inNewTransaction(() -> creditSubmissionRepository.save(submission));
            return submission;
        }
        return creditSubmissionRepository.save(submission);
    }

    private CustomerTontineMmSubmission saveTontine(CustomerTontineMmSubmission submission, boolean isolated) {
        if (isolated) {
            inNewTransaction(() -> tontineSubmissionRepository.save(submission));
            return submission;
        }
        return tontineSubmissionRepository.save(submission);
    }

    private void inNewTransaction(Runnable work) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        template.executeWithoutResult(status -> work.run());
    }

    private CustomerAutomaticPaymentDto refreshCredit(CustomerMobileMoneySubmission submission) {
        if (submission.getStatus() == CustomerSubmissionStatus.EN_COURS && StringUtils.hasText(submission.getPaygatePaymentId())) {
            PaygatePaymentView view = paygateClient.status(submission.getPaygatePaymentId());
            if (view != null) {
                submission = applyCreditStatus(submission, view.status(), view.operatorReference());
            }
        }
        return toCreditDto(submission);
    }

    private CustomerAutomaticPaymentDto refreshTontine(CustomerTontineMmSubmission submission) {
        if (submission.getStatus() == CustomerSubmissionStatus.EN_COURS && StringUtils.hasText(submission.getPaygatePaymentId())) {
            PaygatePaymentView view = paygateClient.status(submission.getPaygatePaymentId());
            if (view != null) {
                submission = applyTontineStatus(submission, view.status(), view.operatorReference());
            }
        }
        return toTontineDto(submission);
    }

    private CustomerMobileMoneySubmission applyCreditStatus(
            CustomerMobileMoneySubmission submission, String status, String operatorReference) {
        if (submission.getStatus() != CustomerSubmissionStatus.EN_COURS) {
            return submission;
        }
        if ("SUCCESS".equalsIgnoreCase(status)) {
            if (StringUtils.hasText(operatorReference)) {
                submission.setMobileMoneyReference(operatorReference);
                creditSubmissionRepository.save(submission);
            }
            creditAdminService.validateFromGateway(submission.getId());
            return creditSubmissionRepository.findById(submission.getId()).orElse(submission);
        }
        if ("FAILED".equalsIgnoreCase(status)) {
            creditAdminService.failFromGateway(submission.getId());
            return creditSubmissionRepository.findById(submission.getId()).orElse(submission);
        }
        return submission;
    }

    private CustomerTontineMmSubmission applyTontineStatus(
            CustomerTontineMmSubmission submission, String status, String operatorReference) {
        if (submission.getStatus() != CustomerSubmissionStatus.EN_COURS) {
            return submission;
        }
        if ("SUCCESS".equalsIgnoreCase(status)) {
            if (StringUtils.hasText(operatorReference)) {
                submission.setMobileMoneyReference(operatorReference);
                tontineSubmissionRepository.save(submission);
            }
            tontineAdminService.validateFromGateway(submission.getId());
            return tontineSubmissionRepository.findById(submission.getId()).orElse(submission);
        }
        if ("FAILED".equalsIgnoreCase(status)) {
            tontineAdminService.failFromGateway(submission.getId());
            return tontineSubmissionRepository.findById(submission.getId()).orElse(submission);
        }
        return submission;
    }

    private void fillFromView(CustomerMobileMoneySubmission submission, PaygatePaymentView view) {
        submission.setPaygatePaymentId(view.paymentId());
        submission.setMobileMoneyReference(trimReference(view.paymentId()));
        submission.setGatewayFeeRate(rate(view.gatewayFeeRate()));
        submission.setGatewayFee((double) view.gatewayFee());
        submission.setAmountCharged((double) view.amountCharged());
    }

    private void fillTontine(CustomerTontineMmSubmission submission, PaygatePaymentView view) {
        submission.setPaygatePaymentId(view.paymentId());
        submission.setMobileMoneyReference(trimReference(view.paymentId()));
        submission.setGatewayFeeRate(rate(view.gatewayFeeRate()));
        submission.setGatewayFee((double) view.gatewayFee());
        submission.setAmountCharged((double) view.amountCharged());
    }

    private PreparedQuote prepare(String network, String phone, long installment) {
        String normalized = WithdrawalFeeBracketService.normalizeNetwork(network);
        long withdrawal = withdrawalFeeBracketService.feeFor(normalized, installment)
                .orElseThrow(() -> new CustomValidationException(
                        "Aucun frais de retrait n'est configuré pour ce montant sur le réseau choisi."));
        String normalizedPhone = normalizePhone(phone);
        if (!paygateClient.isEnabled()) {
            throw new CustomValidationException("Le paiement automatique n'est pas disponible.");
        }
        PaygateQuote quote = paygateClient.quote(normalized, installment + withdrawal);
        return new PreparedQuote(normalized, normalizedPhone, withdrawal, quote.amountDue(), quote);
    }

    private PaymentCollectionOptionsDto.NetworkQuoteDto quoteNetwork(String network, String label, long installment) {
        var builder = PaymentCollectionOptionsDto.NetworkQuoteDto.builder()
                .network(network)
                .label(label)
                .installmentAmount(installment);
        var fee = withdrawalFeeBracketService.feeFor(network, installment);
        if (fee.isEmpty()) {
            return builder.unavailableReason("Aucun frais de retrait n'est configuré pour ce montant.").build();
        }
        builder.withdrawalFee(fee.get());
        if (!paygateClient.isEnabled()) {
            return builder.unavailableReason("Le paiement automatique n'est pas disponible.").build();
        }
        try {
            PaygateQuote quote = paygateClient.quote(network, installment + fee.get());
            return builder
                    .gatewayFeeRate(rate(quote.gatewayFeeRate()))
                    .gatewayFee(quote.gatewayFee())
                    .amountCharged(quote.amountCharged())
                    .build();
        } catch (CustomValidationException ex) {
            return builder.unavailableReason(ex.getMessage()).build();
        }
    }

    private String currentMode() {
        String raw = parameterService.findByKey(MODE_KEY).map(Parameter::getValue).orElse("MANUAL");
        if (raw == null) {
            return "MANUAL";
        }
        String mode = raw.trim().toUpperCase(Locale.ROOT);
        if ("AUTOMATIC".equals(mode) || "BOTH".equals(mode) || "MANUAL".equals(mode)) {
            return mode;
        }
        return "MANUAL";
    }

    private void assertAutomaticAllowed() {
        if ("MANUAL".equals(currentMode())) {
            throw new CustomValidationException("Le paiement automatique n'est pas activé.");
        }
    }

    private Client activeClient() {
        Client client = contextService.requireClient(contextService.currentUsername());
        customerOnboardingService.assertPortalFeatureAllowed(client);
        return client;
    }

    private void assertSameClient(Long clientId) {
        if (!activeClient().getId().equals(clientId)) {
            throw new CustomValidationException("Accès non autorisé à ce paiement.");
        }
    }

    private Credit requireOwnedCredit(Long creditId) {
        Client client = activeClient();
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("credit.not.found"));
        if (credit.getClient() == null || !client.getId().equals(credit.getClient().getId())) {
            throw new CustomValidationException("Accès non autorisé à cet achat.");
        }
        return credit;
    }

    private TontineMember requireOwnedMember(Long memberId) {
        Client client = activeClient();
        TontineMember member = tontineMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("tontine.member.not.found"));
        if (member.getClient() == null || !client.getId().equals(member.getClient().getId())) {
            throw new CustomValidationException("Accès non autorisé à cette tontine.");
        }
        return member;
    }

    private static CustomerAutomaticPaymentDto toCreditDto(CustomerMobileMoneySubmission submission) {
        return CustomerAutomaticPaymentDto.builder()
                .submissionId(submission.getId())
                .purpose(PURPOSE_CREDIT)
                .status(submission.getStatus().name())
                .network(submission.getNetwork())
                .installmentAmount(longValue(submission.getExpectedAmount()))
                .withdrawalFee(longValue(submission.getWithdrawalFee()))
                .gatewayFeeRate(submission.getGatewayFeeRate())
                .gatewayFee(longValue(submission.getGatewayFee()))
                .amountCharged(longValue(submission.getAmountCharged()))
                .message(messageFor(submission.getStatus()))
                .build();
    }

    private static CustomerAutomaticPaymentDto toTontineDto(CustomerTontineMmSubmission submission) {
        return CustomerAutomaticPaymentDto.builder()
                .submissionId(submission.getId())
                .purpose(PURPOSE_TONTINE)
                .status(submission.getStatus().name())
                .network(submission.getNetwork())
                .installmentAmount(longValue(submission.getExpectedAmount()))
                .withdrawalFee(longValue(submission.getWithdrawalFee()))
                .gatewayFeeRate(submission.getGatewayFeeRate())
                .gatewayFee(longValue(submission.getGatewayFee()))
                .amountCharged(longValue(submission.getAmountCharged()))
                .message(messageFor(submission.getStatus()))
                .build();
    }

    private static String messageFor(CustomerSubmissionStatus status) {
        if (status == CustomerSubmissionStatus.EN_COURS) {
            return "Confirmez le paiement sur votre téléphone.";
        }
        if (status == CustomerSubmissionStatus.VALIDE) {
            return "Votre paiement est enregistré.";
        }
        if (status == CustomerSubmissionStatus.ECHEC) {
            return "Le paiement n'a pas abouti. Vous pouvez réessayer.";
        }
        return "";
    }

    static long toFrancs(Double amount) {
        if (amount == null || amount <= 0) {
            throw new CustomValidationException("Le montant à payer est invalide.");
        }
        return Math.round(amount);
    }

    static String normalizePhone(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        if (digits.startsWith("00228")) {
            digits = digits.substring(2);
        }
        if (digits.length() == 8) {
            digits = "228" + digits;
        }
        if (!digits.matches("228\\d{8}")) {
            throw new CustomValidationException("Indiquez un numéro mobile togolais.");
        }
        return digits;
    }

    private static Long parseId(String raw) {
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException ex) {
            throw new CustomValidationException("Référence de paiement invalide.");
        }
    }

    private static String trimReference(String value) {
        if (value == null) {
            return "AUTO";
        }
        return value.length() <= 100 ? value : value.substring(0, 100);
    }

    private static Double rate(BigDecimal rate) {
        return rate == null ? null : rate.doubleValue();
    }

    private static Long longValue(Double value) {
        return value == null ? null : Math.round(value);
    }

    private record PreparedQuote(String network, String phone, long withdrawalFee, long amountDue, PaygateQuote quote) {
    }
}
