package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.service.AccountService;
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
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.util.ClientAccountService;
import com.optimize.elykia.core.service.sale.CreditService;
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

    @Transactional
    public TontineDeliveryDto createDelivery(CreateDeliveryDto dto) {
        log.info("Creating delivery for tontine member ID: {}", dto.getTontineMemberId());

        TontineMember member = memberRepository.findById(dto.getTontineMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Membre de tontine non trouvé"));

        // if (member.getTontineSession().getStatus() != TontineSessionStatus.CLOSED) {
        // throw new CustomValidationException("La session de tontine doit être CLOTUREE
        // pour créer une livraison.");
        // }

        if (deliveryRepository.existsByTontineMemberId(dto.getTontineMemberId())) {
            throw new CustomValidationException("Ce membre a déjà une livraison.");
        }

        List<TontineDeliveryItem> items = new ArrayList<>();
        double totalAmount = 0;

        for (DeliveryItemDto itemDto : dto.getItems()) {
            Articles article = articlesRepository.findById(itemDto.getArticleId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Article non trouvé avec l'ID: " + itemDto.getArticleId()));

            // TODO: Validate stock here before creating delivery
            // if (article.getStockQuantity() < itemDto.getQuantity()) {
            // throw new CustomValidationException(
            // String.format("Stock insuffisant pour l'article '%s'. Disponible: %d,
            // Demandé: %d",
            // article.getName(), article.getStockQuantity(), itemDto.getQuantity())
            // );
            // }

            TontineDeliveryItem item = new TontineDeliveryItem();
            item.setArticles(article);
            item.setQuantity(itemDto.getQuantity());
            item.setUnitPrice(itemDto.getUnitPrice());
            item.setArticleName(article.getCommercialName());
            item.setArticleId(article.getId());
            item.setArticleCode(article.getType() + "-" + article.getMarque());
            double itemTotal = itemDto.getQuantity() * itemDto.getUnitPrice();
            item.setTotalPrice(itemTotal);
            totalAmount += itemTotal;
            items.add(item);
        }

        if (totalAmount > member.getAvailableContribution()) {
            throw new CustomValidationException(
                    String.format("Le montant total (%.2f) dépasse le montant disponible (%.2f)",
                            totalAmount, member.getAvailableContribution()));
        }

        double remainingBalance = member.getAvailableContribution() - totalAmount;

        TontineDelivery delivery = new TontineDelivery();
        delivery.setTontineMember(member);
        delivery.setDeliveryDate(LocalDateTime.now());
        delivery.setTotalAmount(totalAmount);
        delivery.setRemainingBalance(remainingBalance);
        delivery.setCommercialUsername(member.getClient().getCollector());
        delivery.setRequestDate(dto.getRequestDate());

        items.forEach(delivery::addItem);

        User currentUser = userService.getCurrentUser();
        // Assuming 'GESTIONNAIRE' is a role or profile name
        if (currentUser.is("GESTIONNAIRE") || currentUser.is("ADMIN")) {
            member.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
            TontineDelivery savedDelivery = deliveryRepository.save(delivery);
            // creditService.createTontineCredit(savedDelivery);
            log.info("Delivery for member {} created and auto-validated.", member.getId());
            return mapToDto(savedDelivery);
        } else {
            member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
            TontineDelivery savedDelivery = deliveryRepository.save(delivery);
            log.info("Delivery for member {} created with PENDING status.", member.getId());
            return mapToDto(savedDelivery);
        }
    }

    public TontineDeliveryDto distributeTontineDelivery(CreateDeliveryDto dto) {
        TontineDeliveryDto resp = this.createDelivery(dto);
        this.validateDelivery(resp.getId());
        return this.deliverDelivery(resp.getId());
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

        // if (member.getDeliveryStatus() != TontineMemberDeliveryStatus.VALIDATED) {
        // throw new CustomValidationException("La livraison doit être en statut
        // VALIDATED pour être servie.");
        // }

        creditService.createTontineCredit(delivery);
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

            // Publier l'événement de collecte tontine (car une livraison implique une
            // collecte du montant total)
//            eventPublisher.publishEvent(new com.optimize.elykia.core.event.TontineCollectionEvent(
//                    this,
//                    delivery.getTotalAmount(),
//                    delivery.getCommercialUsername(),
//                    member.getClient().getFullName()));
        }

        log.info("Delivery {} marked as DELIVERED.", delivery.getId());
        return mapToDto(delivery);
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
                .clientName(delivery.getTontineMember().getClient().getFullName())
                .deliveryDate(delivery.getDeliveryDate())
                .totalAmount(delivery.getTotalAmount())
                .remainingBalance(delivery.getRemainingBalance())
                .commercialUsername(delivery.getCommercialUsername())
                .deliveryStatus(delivery.getTontineMember().getDeliveryStatus())
                .items(itemDtos)
                .build();
    }
}
