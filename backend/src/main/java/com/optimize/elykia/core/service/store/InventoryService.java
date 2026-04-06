package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.InventoryDto;
import com.optimize.elykia.core.dto.InventoryItemDto;
import com.optimize.elykia.core.dto.PhysicalQuantitySubmissionDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.inventory.Inventory;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import com.optimize.elykia.core.enumaration.InventoryStatus;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.InventoryItemRepository;
import com.optimize.elykia.core.repository.InventoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class InventoryService extends GenericService<Inventory, Long> {

    private final InventoryRepository inventoryRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final ArticlesRepository articlesRepository;
    private final UserService userService;

    protected InventoryService(InventoryRepository repository,
                               InventoryItemRepository inventoryItemRepository,
                               ArticlesRepository articlesRepository,
                               UserService userService) {
        super(repository);
        this.inventoryRepository = repository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.articlesRepository = articlesRepository;
        this.userService = userService;
    }

    public InventoryRepository getRepository() {
        return inventoryRepository;
    }

    @Transactional
    public Inventory createInventory() {
        // Vérifier qu'il n'y a pas d'inventaire en cours
        if (!canCreateNewInventory()) {
            throw new ApplicationException("Un inventaire est déjà en cours. Veuillez finaliser l'inventaire en cours avant d'en créer un nouveau.");
        }

        Inventory inventory = new Inventory();
        inventory.setInventoryDate(LocalDate.now());
        inventory.setStatus(InventoryStatus.DRAFT);
        inventory.setCreatedByUser(userService.getCurrentUser().getUsername());

        // Récupérer tous les articles actifs
        Page<Articles> articlesPage = articlesRepository.findByState(State.ENABLED, Pageable.unpaged());
        List<Articles> articles = articlesPage.getContent();

        // Créer un InventoryItem pour chaque article
        for (Articles article : articles) {
            InventoryItem item = new InventoryItem();
            item.setInventory(inventory);
            item.setArticle(article);
            item.setSystemQuantity(article.getStockQuantity());
            item.setStatus(InventoryItemStatus.PENDING);
            inventory.addItem(item);
        }

        return create(inventory);
    }

    public boolean canCreateNewInventory() {
        Optional<Inventory> currentInventory = inventoryRepository.findCurrentInventory();
        return currentInventory.isEmpty();
    }

    public Optional<Inventory> getCurrentInventory() {
        return inventoryRepository.findCurrentInventory();
    }

    public Inventory getInventoryById(Long id) {
        return getById(id);
    }

    public Page<Inventory> getAllInventories(Pageable pageable) {
        return getAll(pageable);
    }

    @Transactional
    public Inventory submitPhysicalQuantities(PhysicalQuantitySubmissionDto dto) {
        Inventory inventory = getById(dto.getInventoryId());

        if (inventory.getStatus() != InventoryStatus.DRAFT && inventory.getStatus() != InventoryStatus.IN_PROGRESS) {
            throw new ApplicationException("Impossible de modifier les quantités physiques. L'inventaire n'est plus en cours.");
        }

        Map<Long, Integer> quantities = dto.getItems();
        List<InventoryItem> items = inventoryItemRepository.findByInventoryId(inventory.getId());

        for (InventoryItem item : items) {
            Long articleId = item.getArticle().getId();
            if (quantities.containsKey(articleId)) {
                item.setPhysicalQuantity(quantities.get(articleId));
                item.calculateDifference();
            }
        }

        // Mettre à jour le statut de l'inventaire
        inventory.setStatus(InventoryStatus.IN_PROGRESS);
        update(inventory);

        return inventory;
    }

    public List<InventoryItemDto> getInventoryItems(Long inventoryId) {
        List<InventoryItem> items = inventoryItemRepository.findByInventoryId(inventoryId);
        return items.stream()
                .map(this::toInventoryItemDto)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDto> getInventoryItemsWithDiscrepancies(Long inventoryId) {
        List<InventoryItem> items = inventoryItemRepository.findByInventoryIdAndDifferenceNotZero(inventoryId);
        return items.stream()
                .map(this::toInventoryItemDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public Inventory finalizeInventory(Long inventoryId) {
        Inventory inventory = getById(inventoryId);

        if (inventory.getStatus() != InventoryStatus.IN_PROGRESS && inventory.getStatus() != InventoryStatus.RECONCILED) {
            throw new ApplicationException("Seuls les inventaires en cours ou réconciliés peuvent être finalisés.");
        }

        // Vérifier que tous les écarts sont réconciliés
        List<InventoryItem> itemsWithDiscrepancies = inventoryItemRepository.findByInventoryIdAndDifferenceNotZero(inventoryId);
        List<InventoryItem> unreconciledItems = itemsWithDiscrepancies.stream()
                .filter(item -> item.getStatus() != InventoryItemStatus.RECONCILED && item.getStatus() != InventoryItemStatus.VALIDATED)
                .collect(Collectors.toList());

        if (!unreconciledItems.isEmpty()) {
            throw new ApplicationException("Impossible de finaliser l'inventaire. Il reste des écarts non réconciliés.");
        }

        inventory.setStatus(InventoryStatus.COMPLETED);
        inventory.setCompletedAt(LocalDateTime.now());
        return update(inventory);
    }

    private InventoryItemDto toInventoryItemDto(InventoryItem item) {
        InventoryItemDto dto = new InventoryItemDto();
        dto.setId(item.getId());
        dto.setInventoryId(item.getInventory().getId());
        dto.setArticleId(item.getArticle().getId());
        dto.setArticleName(item.getArticle().getName());
        dto.setArticleMarque(item.getArticle().getMarque());
        dto.setArticleModel(item.getArticle().getModel());
        dto.setArticleType(item.getArticle().getType());
        dto.setSystemQuantity(item.getSystemQuantity());
        dto.setPhysicalQuantity(item.getPhysicalQuantity());
        dto.setDifference(item.getDifference());
        dto.setStatus(item.getStatus());
        dto.setReconciliationComment(item.getReconciliationComment());
        dto.setReconciledBy(item.getReconciledBy());
        dto.setReconciledAt(item.getReconciledAt());
        dto.setMarkAsDebt(item.getMarkAsDebt());
        dto.setDebtCancelled(item.getDebtCancelled());
        return dto;
    }

    public InventoryDto toInventoryDto(Inventory inventory) {
        InventoryDto dto = new InventoryDto();
        dto.setId(inventory.getId());
        dto.setInventoryDate(inventory.getInventoryDate());
        dto.setStatus(inventory.getStatus());
        dto.setCreatedByUser(inventory.getCreatedBy());
        dto.setCompletedAt(inventory.getCompletedAt());
        List<InventoryItemDto> items = inventory.getItems().stream()
                .map(this::toInventoryItemDto)
                .collect(Collectors.toList());
        dto.setItems(items);
        return dto;
    }
}

