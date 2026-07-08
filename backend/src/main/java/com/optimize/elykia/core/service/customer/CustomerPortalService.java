package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.OrderDto;
import com.optimize.elykia.core.dto.OrderItemDto;
import com.optimize.elykia.core.dto.customer.*;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.customer.CustomerMobileMoneySubmissionRepository;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import com.optimize.elykia.core.service.order.OrderService;
import com.optimize.elykia.core.service.store.ArticlesService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerPortalService {

    private final CustomerContextService contextService;
    private final CreditRepository creditRepository;
    private final CreditTimelineRepository creditTimelineRepository;
    private final CustomerMobileMoneySubmissionRepository submissionRepository;
    private final ArticlesService articlesService;
    private final OrderService orderService;
    private final CreditArticlesRepository creditArticlesRepository;

    public CustomerDashboardDto getDashboard() {
        Client client = contextService.requireClient(contextService.currentUsername());
        List<Credit> credits = creditRepository.findByClient_IdAndTypeOrderByBeginDateDesc(client.getId(), OperationType.CREDIT);
        List<Credit> active = credits.stream()
                .filter(c -> CreditStatus.INPROGRESS.equals(c.getStatus()))
                .toList();

        double totalCredit = active.stream().mapToDouble(Credit::getTotalAmount).sum();
        double totalPaid = active.stream().mapToDouble(c -> c.getTotalAmountPaid() != null ? c.getTotalAmountPaid() : 0).sum();
        double totalRemaining = active.stream().mapToDouble(c -> c.getTotalAmountRemaining() != null ? c.getTotalAmountRemaining() : 0).sum();
        double progress = totalCredit > 0 ? (totalPaid / totalCredit) * 100 : 0;

        NextPaymentInfo nextPayment = resolveNextPayment(active);

        List<CustomerActivityDto> activities = buildRecentActivities(client.getId(), credits);

        return CustomerDashboardDto.builder()
                .clientId(String.valueOf(client.getId()))
                .fullName(client.getFullName())
                .activeCreditCount(active.size())
                .totalCreditAmount(totalCredit)
                .totalPaidAmount(totalPaid)
                .totalRemainingAmount(totalRemaining)
                .nextPaymentAmount(nextPayment != null ? nextPayment.amount() : 0)
                .nextPaymentDate(nextPayment != null ? nextPayment.date() : null)
                .nextPaymentCreditId(nextPayment != null ? nextPayment.creditId() : null)
                .nextInstallmentNumber(nextPayment != null ? nextPayment.installmentNumber() : 0)
                .progressPercent(Math.min(100, progress))
                .recentActivities(activities)
                .build();
    }

    public List<CustomerPurchaseDto> getPurchases() {
        Client client = contextService.requireClient(contextService.currentUsername());
        return creditRepository.findByClient_IdAndTypeOrderByBeginDateDesc(client.getId(), OperationType.CREDIT)
                .stream()
                .map(this::toPurchaseSummary)
                .toList();
    }

    public CustomerPurchaseDto getPurchase(Long creditId) {
        Credit credit = requireOwnedCredit(creditId);
        return toPurchaseDetail(credit);
    }

    public List<CustomerRecoveryDto> getRecoveries(Long creditId) {
        requireOwnedCredit(creditId);
        List<CustomerRecoveryDto> result = new ArrayList<>();
        List<CreditTimeline> timelines = creditTimelineRepository.findByCredit_id(creditId);
        int index = 1;
        for (CreditTimeline tl : timelines) {
            result.add(CustomerRecoveryDto.builder()
                    .id(String.valueOf(tl.getId()))
                    .installmentNumber(index++)
                    .amount(tl.getAmount())
                    .paymentDate(tl.getCreatedDate() != null ? tl.getCreatedDate().toLocalDate().toString() : null)
                    .status("VALIDE")
                    .build());
        }
        submissionRepository.findByCreditIdAndStatus(creditId, CustomerSubmissionStatus.INITIE).forEach(sub ->
                result.add(CustomerRecoveryDto.builder()
                        .id(String.valueOf(sub.getId()))
                        .installmentNumber(sub.getInstallmentNumber())
                        .amount(sub.getMobileMoneyAmount())
                        .paymentDate(sub.getCreatedDate() != null ? sub.getCreatedDate().toLocalDate().toString() : null)
                        .status("INITIE")
                        .mobileMoneyPhone(sub.getMobileMoneyPhone())
                        .mobileMoneyAmount(sub.getMobileMoneyAmount())
                        .mobileMoneyReference(sub.getMobileMoneyReference())
                        .build()));
        result.sort(Comparator.comparingInt(CustomerRecoveryDto::getInstallmentNumber));
        return result;
    }

    @Transactional
    public CustomerRecoveryDto submitMobileMoney(CustomerMobileMoneyRequest request) {
        Long creditId = Long.parseLong(request.getDistributionId());
        Credit credit = requireOwnedCredit(creditId);
        Client client = contextService.requireClient(contextService.currentUsername());

        CustomerMobileMoneySubmission submission = new CustomerMobileMoneySubmission();
        submission.setClientId(client.getId());
        submission.setCreditId(credit.getId());
        submission.setInstallmentNumber(request.getInstallmentNumber());
        submission.setExpectedAmount(request.getExpectedAmount());
        submission.setMobileMoneyPhone(request.getMobileMoneyPhone());
        submission.setMobileMoneyAmount(request.getMobileMoneyAmount());
        submission.setMobileMoneyReference(request.getMobileMoneyReference());
        submission.setNotes(request.getNotes());
        submission.setStatus(CustomerSubmissionStatus.INITIE);
        submission.setCreatedBy(client.getFullName());
        submission = submissionRepository.save(submission);

        return CustomerRecoveryDto.builder()
                .id(String.valueOf(submission.getId()))
                .installmentNumber(submission.getInstallmentNumber())
                .amount(submission.getMobileMoneyAmount())
                .paymentDate(LocalDate.now().toString())
                .status("INITIE")
                .mobileMoneyPhone(submission.getMobileMoneyPhone())
                .mobileMoneyAmount(submission.getMobileMoneyAmount())
                .mobileMoneyReference(submission.getMobileMoneyReference())
                .build();
    }

    public List<CustomerArticleDto> getArticles(String search, String category) {
        var page = StringUtils.hasText(search)
                ? articlesService.elasticSearchEnabled(search, PageRequest.of(0, 200))
                : articlesService.getAllEnabled(PageRequest.of(0, 200));
        return page.getContent().stream()
                .filter(a -> !StringUtils.hasText(category) || category.equalsIgnoreCase(a.getType()))
                .map(this::toArticleDto)
                .toList();
    }

    public List<CustomerArticleTypeDto> getTopArticleTypes(int limit) {
        int size = Math.min(Math.max(limit, 1), 20);
        return creditArticlesRepository.findTopArticleTypesBySoldQuantity(PageRequest.of(0, size))
                .stream()
                .map(row -> CustomerArticleTypeDto.builder()
                        .type((String) row[0])
                        .label((String) row[0])
                        .totalQuantitySold(row[1] != null ? ((Number) row[1]).longValue() : 0L)
                        .build())
                .toList();
    }

    @Transactional
    public CustomerOrderResponse submitOrder(CustomerOrderRequest request) {
        Client client = contextService.requireClient(contextService.currentUsername());
        OrderDto dto = new OrderDto();
        dto.setClientId(client.getId());
        Set<OrderItemDto> items = request.getItems().stream().map(item -> {
            OrderItemDto oi = new OrderItemDto();
            oi.setArticleId(Long.parseLong(item.getArticleId()));
            oi.setQuantity(item.getQuantity());
            return oi;
        }).collect(Collectors.toSet());
        dto.setItems(items);
        Order order = orderService.createOrder(dto);
        return CustomerOrderResponse.builder()
                .orderId(String.valueOf(order.getId()))
                .reference("CMD-" + order.getId())
                .status(mapOrderStatus(order.getStatus()))
                .totalAmount(order.getTotalAmount())
                .createdAt(order.getOrderDate().toString())
                .build();
    }

    private Credit requireOwnedCredit(Long creditId) {
        Client client = contextService.requireClient(contextService.currentUsername());
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("credit.not.found"));
        if (credit.getClient() == null || !client.getId().equals(credit.getClient().getId())) {
            throw new CustomValidationException("Accès non autorisé à cet achat.");
        }
        return credit;
    }

    private CustomerPurchaseDto toPurchaseSummary(Credit credit) {
        int installmentCount = estimateInstallments(credit);
        List<CreditTimeline> timelines = creditTimelineRepository.findByCredit_id(credit.getId());
        return CustomerPurchaseDto.builder()
                .id(String.valueOf(credit.getId()))
                .reference(credit.getReference())
                .totalAmount(nullSafe(credit.getTotalAmount()))
                .paidAmount(nullSafe(credit.getTotalAmountPaid()))
                .remainingAmount(nullSafe(credit.getTotalAmountRemaining()))
                .dailyPayment(nullSafe(credit.getDailyStake()))
                .startDate(credit.getBeginDate() != null ? credit.getBeginDate().toString() : null)
                .endDate(credit.getExpectedEndDate() != null ? credit.getExpectedEndDate().toString() : null)
                .status(mapCreditStatus(credit.getStatus()))
                .articleCount(credit.getArticles() != null ? credit.getArticles().size() : 0)
                .installmentCount(installmentCount)
                .paidInstallmentCount(timelines.size())
                .lateInstallmentCount(0)
                .initiatedInstallmentCount(submissionRepository.findByCreditIdAndStatus(credit.getId(), CustomerSubmissionStatus.INITIE).size())
                .build();
    }

    private CustomerPurchaseDto toPurchaseDetail(Credit credit) {
        CustomerPurchaseDto summary = toPurchaseSummary(credit);
        List<CustomerPurchaseItemDto> items = new ArrayList<>();
        if (credit.getArticles() != null) {
            for (CreditArticles ca : credit.getArticles()) {
                if (ca.getArticles() != null) {
                    items.add(CustomerPurchaseItemDto.builder()
                            .articleId(String.valueOf(ca.getArticles().getId()))
                            .articleName(ca.getArticles().getName())
                            .quantity(ca.getQuantity())
                            .unitPrice(ca.getArticles().getCreditSalePrice())
                            .totalPrice(ca.getArticles().getCreditSalePrice() * ca.getQuantity())
                            .build());
                }
            }
        }
        return CustomerPurchaseDto.builder()
                .id(summary.getId())
                .reference(summary.getReference())
                .totalAmount(summary.getTotalAmount())
                .paidAmount(summary.getPaidAmount())
                .remainingAmount(summary.getRemainingAmount())
                .dailyPayment(summary.getDailyPayment())
                .startDate(summary.getStartDate())
                .endDate(summary.getEndDate())
                .status(summary.getStatus())
                .articleCount(summary.getArticleCount())
                .items(items)
                .recoveries(getRecoveries(credit.getId()))
                .installmentCount(summary.getInstallmentCount())
                .paidInstallmentCount(summary.getPaidInstallmentCount())
                .lateInstallmentCount(summary.getLateInstallmentCount())
                .initiatedInstallmentCount(summary.getInitiatedInstallmentCount())
                .build();
    }

    /**
     * Détermine la prochaine mise payable pour le premier crédit actif ayant un solde restant.
     * Priorité : soumission Mobile Money déjà initiée, sinon prochaine échéance non payée.
     */
    private NextPaymentInfo resolveNextPayment(List<Credit> activeCredits) {
        for (Credit credit : activeCredits) {
            double remaining = nullSafe(credit.getTotalAmountRemaining());
            if (remaining <= 0) {
                continue;
            }
            List<CustomerMobileMoneySubmission> initiated = submissionRepository
                    .findByCreditIdAndStatus(credit.getId(), CustomerSubmissionStatus.INITIE);
            if (!initiated.isEmpty()) {
                CustomerMobileMoneySubmission sub = initiated.stream()
                        .min(Comparator.comparingInt(CustomerMobileMoneySubmission::getInstallmentNumber))
                        .orElse(initiated.get(0));
                return new NextPaymentInfo(
                        String.valueOf(credit.getId()),
                        sub.getInstallmentNumber(),
                        sub.getExpectedAmount() != null ? sub.getExpectedAmount() : sub.getMobileMoneyAmount(),
                        sub.getCreatedDate() != null
                                ? sub.getCreatedDate().toLocalDate().toString()
                                : LocalDate.now().toString());
            }
            int paidCount = creditTimelineRepository.findByCredit_id(credit.getId()).size();
            int nextInstallment = paidCount + 1;
            double amount = nullSafe(credit.getDailyStake());
            if (amount <= 0) {
                continue;
            }
            return new NextPaymentInfo(
                    String.valueOf(credit.getId()),
                    nextInstallment,
                    amount,
                    LocalDate.now().plusDays(1).toString());
        }
        return null;
    }

    private record NextPaymentInfo(String creditId, int installmentNumber, double amount, String date) {}

    private List<CustomerActivityDto> buildRecentActivities(Long clientId, List<Credit> credits) {
        List<CustomerActivityDto> activities = new ArrayList<>();
        creditTimelineRepository.findByCredit_Client_Id(clientId, PageRequest.of(0, 5))
                .forEach(tl -> activities.add(CustomerActivityDto.builder()
                        .id(String.valueOf(tl.getId()))
                        .type("RECOVERY")
                        .label("Mise crédit " + (tl.getCredit() != null ? tl.getCredit().getReference() : ""))
                        .amount(tl.getAmount())
                        .date(tl.getCreatedDate() != null ? tl.getCreatedDate().toLocalDate().toString() : null)
                        .status("VALIDE")
                        .build()));
        credits.stream().limit(3).forEach(c -> activities.add(CustomerActivityDto.builder()
                .id(String.valueOf(c.getId()))
                .type("ORDER")
                .label("Crédit " + c.getReference())
                .amount(nullSafe(c.getTotalAmount()))
                .date(c.getBeginDate() != null ? c.getBeginDate().toString() : null)
                .status(mapCreditStatus(c.getStatus()))
                .build()));
        return activities.stream().limit(8).toList();
    }

    private CustomerArticleDto toArticleDto(Articles article) {
        String commercialName = article.getCommercialName();
        return CustomerArticleDto.builder()
                .id(String.valueOf(article.getId()))
                .name(article.getName())
                .commercialName(commercialName)
                .displayName(buildArticleDisplayName(commercialName, article.getName()))
                .description(article.getMarque() + " " + article.getModel())
                .category(article.getType())
                .creditSalePrice(article.getCreditSalePrice())
                .available(article.getStockQuantity() != null && article.getStockQuantity() > 0)
                .build();
    }

    private static String buildArticleDisplayName(String commercialName, String name) {
        if (!StringUtils.hasText(commercialName)) {
            return StringUtils.hasText(name) ? name.trim() : "";
        }
        if (!StringUtils.hasText(name) || commercialName.trim().equalsIgnoreCase(name.trim())) {
            return commercialName.trim();
        }
        return (commercialName.trim() + " " + name.trim()).trim();
    }

    private static int estimateInstallments(Credit credit) {
        if (credit.getBeginDate() != null && credit.getExpectedEndDate() != null) {
            return (int) ChronoUnit.DAYS.between(credit.getBeginDate(), credit.getExpectedEndDate()) + 1;
        }
        if (credit.getRemainingDaysCount() != null) {
            return Math.min(31, credit.getRemainingDaysCount());
        }
        return 12;
    }

    private static double nullSafe(Double value) {
        return value != null ? value : 0;
    }

    private static String mapCreditStatus(CreditStatus status) {
        if (status == null) return "INITIE";
        return switch (status) {
            case INPROGRESS -> "VALIDE";
            case SETTLED -> "LIVRE";
            default -> "INITIE";
        };
    }

    private static String mapOrderStatus(OrderStatus status) {
        if (status == null) return "INITIE";
        return switch (status) {
            case PENDING -> "INITIE";
            case ACCEPTED -> "VALIDE";
            case SOLD -> "LIVRE";
            default -> "INITIE";
        };
    }
}
