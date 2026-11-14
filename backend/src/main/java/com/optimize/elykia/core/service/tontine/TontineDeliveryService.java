package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.service.AccountService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.CreateDeliveryDto;
import com.optimize.elykia.core.dto.DeliveryItemDto;
import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.dto.TontineDeliveryItemDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.monitoring.BusinessMetricsPublisher;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.util.ClientAccountService;
import com.optimize.elykia.core.service.sale.CashSalePricingService;
import com.optimize.elykia.core.service.sale.CreditService;
import com.optimize.elykia.core.service.tontine.allocation.TontineProjectedBalanceCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class TontineDeliveryService {

    private final TontineDeliveryRepository deliveryRepository;
    private final TontineMemberRepository memberRepository;
    private final TontineSessionRepository sessionRepository;
    private final ArticlesRepository articlesRepository;
    private final UserService userService;
    private final CreditService creditService;
    private final ClientAccountService clientAccountService;
    private final AccountService accountService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final ClientService clientService;
    private final TontineDeliveryReferenceService deliveryReferenceService;
    private final TontineProjectedBalanceCalculator projectedBalanceCalculator;

    @Autowired(required = false)
    private CashSalePricingService cashSalePricingService;
    private BusinessMetricsPublisher metricsPublisher;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setMetricsPublisher(BusinessMetricsPublisher metricsPublisher) {
        this.metricsPublisher = metricsPublisher;
    }

    @Transactional
    public TontineDeliveryDto createDelivery(CreateDeliveryDto dto) {
        log.info("Creating delivery for tontine member ID: {}", dto.getTontineMemberId());

        TontineMember member = memberRepository.findById(dto.getTontineMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Membre de tontine non trouvé"));

        requireSessionStatus(member, TontineSessionStatus.ACTIVE,
                "La commande tontine n'est possible que tant que la session est ouverte.");

        return persistNewDelivery(member, dto);
    }

    public TontineDeliveryDto distributeTontineDelivery(CreateDeliveryDto dto) {
        TontineMember member = memberRepository.findById(dto.getTontineMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Membre de tontine non trouvé"));

        requireSessionStatus(member, TontineSessionStatus.CLOSED,
                "La livraison directe n'est possible qu'une fois la session clôturée.");

        TontineDeliveryDto resp = persistNewDelivery(member, dto);
        this.validateDelivery(resp.getId());
        return this.deliverDelivery(resp.getId());
    }

    private TontineDeliveryDto persistNewDelivery(TontineMember member, CreateDeliveryDto dto) {
        if (deliveryRepository.existsByTontineMemberId(member.getId())) {
            throw new CustomValidationException("Ce membre a déjà une livraison.");
        }

        List<TontineDeliveryItem> items = new ArrayList<>();
        double totalAmount = buildItems(member, dto.getItems(), items);
        double projected = requireWithinProjectedBalance(member, totalAmount);
        double available = availableOf(member);

        LocalDateTime requestDate = dto.getRequestDate() != null ? dto.getRequestDate() : LocalDateTime.now();

        TontineDelivery delivery = new TontineDelivery();
        delivery.setTontineMember(member);
        // Placeholder until effective delivery (column is NOT NULL); overwritten on deliver/distribute.
        delivery.setDeliveryDate(requestDate);
        delivery.setTotalAmount(totalAmount);
        delivery.setRemainingBalance(Math.max(0.0, available - totalAmount));
        delivery.setProjectedBalance(projected);
        delivery.setAvailableAtOrder(available);
        delivery.setCommercialUsername(member.getClient().getCollector());
        delivery.setRequestDate(requestDate);
        delivery.setReference(deliveryReferenceService.resolveReference(dto.getReference(), requestDate));
        delivery.setOperationConsentCode(dto.getOperationConsentCode());
        delivery.setSyncConsentCode(dto.getSyncConsentCode());

        items.forEach(delivery::addItem);

        User currentUser = userService.getCurrentUser();
        if (currentUser.is("GESTIONNAIRE") || currentUser.is("ADMIN")) {
            member.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
            TontineDelivery savedDelivery = deliveryRepository.save(delivery);
            if (metricsPublisher != null) {
                metricsPublisher.tontineDeliveryCreated(member.getClient().getCollector());
            }
            log.info("Delivery for member {} created and auto-validated.", member.getId());
            return mapToDto(savedDelivery);
        }

        member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        TontineDelivery savedDelivery = deliveryRepository.save(delivery);
        log.info("Delivery for member {} created with PENDING status (commande).", member.getId());
        return mapToDto(savedDelivery);
    }

    private void requireSessionStatus(TontineMember member, TontineSessionStatus expected, String message) {
        TontineSession session = member.getTontineSession();
        if (session == null || session.getStatus() != expected) {
            throw new CustomValidationException(message);
        }
    }

    @Transactional
    public TontineDeliveryDto validateDelivery(Long deliveryId) {
        TontineDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Livraison non trouvée"));
        TontineMember member = delivery.getTontineMember();

        // if (member.getDeliveryStatus() != TontineMemberDeliveryStatus.PENDING) {
        // throw new CustomValidationException("La livraison doit être en statut PENDING
        // pour être validée.");
        // }

        member.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
        memberRepository.save(member);
        //
        log.info("Delivery {} validated.", delivery.getId());
        return mapToDto(delivery);
    }

    public Page<TontineDeliveryDto> getValidatedDeliveries(Pageable pageable) {
        Page<TontineMember> membersPage = memberRepository.findByDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED,
                pageable);

        List<TontineDeliveryDto> content = membersPage.stream()
                .map(member -> {
                    if (member.getDelivery() != null) {
                        return mapToDto(member.getDelivery());
                    }
                    log.warn("Member {} has VALIDATED status but no associated delivery found.", member.getId());
                    return null;
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());

        return new PageImpl<>(content, pageable, membersPage.getTotalElements());
    }

    @Transactional
    public TontineDeliveryDto deliverDelivery(Long deliveryId) {
        TontineDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Livraison non trouvée"));
        TontineMember member = delivery.getTontineMember();

        requireSessionStatus(member, TontineSessionStatus.CLOSED,
                "La remise n'est possible qu'une fois la session clôturée.");

        double available = availableOf(member);
        double total = delivery.getTotalAmount() != null ? delivery.getTotalAmount() : 0.0;
        if (TontineProjectedBalanceCalculator.exceeds(total, available)) {
            throw new CustomValidationException(String.format(
                    "Le solde réel (%.2f) ne couvre pas la commande (%.2f). Complétez le solde ou réduisez la commande.",
                    available, total));
        }
        delivery.setRemainingBalance(available - total);

        creditService.createTontineCredit(delivery);
        delivery.setDeliveryDate(LocalDateTime.now());
        deliveryRepository.save(delivery);
        member.setDeliveryStatus(TontineMemberDeliveryStatus.DELIVERED);
        memberRepository.save(member);

        // Add remaining balance to client account
        if (delivery.getRemainingBalance() > 0) {
            Account clientAccount = member.getClient().getAccount();
            if (clientAccount == null) {
                // Fetch account if not eager loaded or throw if client must always have an
                // account
                // clientAccount = accountService.findByClientId(member.getClient().getId())
                // .orElseThrow(() -> new CustomValidationException("Le client n'a pas de compte
                // pour y verser le solde."));
                throw new CustomValidationException(
                        "Le client n'a pas de compte pour y verser le solde. (AccountService not implemented or findByClientId missing)");
            }
            clientAccount.setAccountBalance(clientAccount.getAccountBalance() + delivery.getRemainingBalance());
            accountService.update(clientAccount); // Assuming update method exists and saves
            log.warn(
                    "AccountService.update(clientAccount) is commented out as AccountService.findByClientId is missing.");
            clientAccountService.recordMovement(member.getClient(), delivery.getRemainingBalance(),
                    "TONTINE_DELIVERY_DEPOSIT", delivery);
        }

        // Check if all members of the session are delivered
        TontineSession session = member.getTontineSession();
        // Reload session to ensure 'members' collection is initialized if LAZY fetched
        session = sessionRepository.findById(session.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tontine Session non trouvée pour le membre."));

        boolean allDelivered = session.getMembers().stream()
                .allMatch(m -> m.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED);

        if (allDelivered) {
            session.setStatus(TontineSessionStatus.ENDED);
            sessionRepository.save(session);
            log.info("Tontine session {} has been ENDED as all members are delivered.", session.getId());
        }

        if (eventPublisher != null) {
            // Publier l'événement de livraison tontine
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.TontineDeliveryEvent(
                    this,
                    delivery.getTotalAmount(),
                    delivery.getCommercialUsername(),
                    member.getClient().getFullName()));

        }

        clientService.updateTontineStatus(member.getClient().getId(), Boolean.FALSE);
        log.info("Delivery {} marked as DELIVERED.", delivery.getId());
        return mapToDto(delivery);
    }

    @Transactional
    public TontineDeliveryDto replaceItems(Long deliveryId, List<DeliveryItemDto> itemDtos) {
        TontineDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Livraison non trouvée"));
        TontineMember member = delivery.getTontineMember();
        if (member.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED) {
            throw new CustomValidationException("Une commande déjà livrée ne peut plus être modifiée.");
        }
        TontineSession session = member.getTontineSession();
        if (session == null || session.getStatus() == TontineSessionStatus.ENDED) {
            throw new CustomValidationException("La session est terminée. La commande ne peut plus être modifiée.");
        }
        if (itemDtos == null || itemDtos.isEmpty()) {
            throw new CustomValidationException("La commande doit contenir au moins un article.");
        }

        List<TontineDeliveryItem> items = new ArrayList<>();
        double totalAmount = buildItems(member, itemDtos, items);
        requireWithinProjectedBalance(member, totalAmount);
        if (session.getStatus() == TontineSessionStatus.CLOSED
                && TontineProjectedBalanceCalculator.exceeds(totalAmount, availableOf(member))) {
            throw new CustomValidationException(String.format(
                    "Réduisez la commande jusqu'au solde réel (%.2f).",
                    availableOf(member)));
        }

        new ArrayList<>(delivery.getItems()).forEach(delivery::removeItem);
        items.forEach(delivery::addItem);
        delivery.setTotalAmount(totalAmount);
        delivery.setRemainingBalance(Math.max(0.0, availableOf(member) - totalAmount));
        return mapToDto(deliveryRepository.save(delivery));
    }

    private double buildItems(TontineMember member, List<DeliveryItemDto> itemDtos, List<TontineDeliveryItem> items) {
        double totalAmount = 0;
        for (DeliveryItemDto itemDto : itemDtos) {
            Articles article = articlesRepository.findById(itemDto.getArticleId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Article non trouvé avec l'ID: " + itemDto.getArticleId()));

            TontineDeliveryItem item = new TontineDeliveryItem();
            item.setArticles(article);
            item.setArticleName(article.getCommercialName());
            item.setArticleId(article.getId());
            item.setArticleCode(article.getType() + "-" + article.getMarque());
            double itemTotal;
            String commercial = member.getClient() != null ? member.getClient().getCollector() : null;
            if (cashSalePricingService != null && commercial != null) {
                var quote = cashSalePricingService.quoteTontine(
                        article,
                        commercial,
                        itemDto.getSalePackMode(),
                        itemDto.getPackCount(),
                        itemDto.getUnitsPerPack(),
                        itemDto.getQuantity());
                quote.apply(item);
                itemTotal = quote.getLineAmount();
            } else {
                item.setQuantity(itemDto.getQuantity());
                item.setUnitPrice(itemDto.getUnitPrice());
                itemTotal = itemDto.getQuantity() * itemDto.getUnitPrice();
                item.setTotalPrice(itemTotal);
            }
            totalAmount += itemTotal;
            items.add(item);
        }
        return totalAmount;
    }

    private double requireWithinProjectedBalance(TontineMember member, double totalAmount) {
        double projected = projectedBalanceCalculator.project(member);
        if (TontineProjectedBalanceCalculator.exceeds(totalAmount, projected)) {
            if (metricsPublisher != null && member.getClient() != null) {
                metricsPublisher.tontineDeliveryAmountExceeded(member.getClient().getCollector());
            }
            throw new CustomValidationException(String.format(
                    "Le montant total (%.2f) dépasse le solde prévisionnel (%.2f)",
                    totalAmount, projected));
        }
        return projected;
    }

    private double availableOf(TontineMember member) {
        return member.getAvailableContribution() != null ? member.getAvailableContribution() : 0.0;
    }

    public TontineDeliveryDto getDeliveryByMemberId(Long tontineMemberId) {
        log.info("Fetching delivery for tontine member ID: {}", tontineMemberId);
        TontineDelivery delivery = deliveryRepository.findByTontineMemberId(tontineMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("Aucune livraison trouvée pour ce membre"));
        return mapToDto(delivery);
    }

    private TontineDeliveryDto mapToDto(TontineDelivery delivery) {
        if (delivery == null) {
            return null;
        }
        List<TontineDeliveryItemDto> itemDtos = delivery.getItems().stream()
                .map(item -> TontineDeliveryItemDto.builder()
                        .id(item.getId())
                        .articleId(item.getArticles().getId())
                        .articleName(item.getArticles().getCommercialName()) // Changed from
                                                                             // item.getArticles().getName() or
                                                                             // getCommercialName()
                        .articleCode(item.getArticles().getType() + "-" + item.getArticles().getMarque()) // Changed
                                                                                                          // from
                                                                                                          // item.getArticles().getReference()
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        return TontineDeliveryDto.builder()
                .id(delivery.getId())
                .tontineMemberId(delivery.getTontineMember().getId())
                .reference(delivery.getReference())
                .clientName(delivery.getTontineMember().getClient().getFullName())
                .requestDate(delivery.getRequestDate())
                .deliveryDate(delivery.getDeliveryDate())
                .totalAmount(delivery.getTotalAmount())
                .remainingBalance(delivery.getRemainingBalance())
                .projectedBalance(delivery.getProjectedBalance())
                .availableAtOrder(delivery.getAvailableAtOrder())
                .commercialUsername(delivery.getCommercialUsername())
                .deliveryStatus(delivery.getTontineMember().getDeliveryStatus())
                .items(itemDtos)
                .operationConsentCode(delivery.getOperationConsentCode())
                .syncConsentCode(delivery.getSyncConsentCode())
                .build();
    }
}
