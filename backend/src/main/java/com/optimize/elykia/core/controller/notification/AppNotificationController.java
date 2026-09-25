package com.optimize.elykia.core.controller.notification;

import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.notification.AppNotificationGroupDto;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/app-notifications")
@RequiredArgsConstructor
public class AppNotificationController {

    private final AppNotificationService notificationService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<?> list() {
        User user = userService.getCurrentUser();
        List<AppNotificationGroupDto> groups = notificationService.listGrouped(user);
        return ResponseEntity.ok(ResponseUtil.successResponse(groups));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount() {
        User user = userService.getCurrentUser();
        long count = notificationService.unreadCount(user);
        return ResponseEntity.ok(ResponseUtil.successResponse(Map.of("count", count)));
    }

    /** Count for login toast — excludes TONTINE_CATCHUP (rattrapages). */
    @GetMapping("/unread-count-for-toast")
    public ResponseEntity<?> unreadCountForToast() {
        User user = userService.getCurrentUser();
        long count = notificationService.unreadCountExcludingCatchup(user);
        return ResponseEntity.ok(ResponseUtil.successResponse(Map.of("count", count)));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        User user = userService.getCurrentUser();
        notificationService.markRead(user, id);
        return ResponseEntity.ok(ResponseUtil.successResponse(Boolean.TRUE));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead() {
        User user = userService.getCurrentUser();
        notificationService.markAllRead(user);
        return ResponseEntity.ok(ResponseUtil.successResponse(Boolean.TRUE));
    }
}
