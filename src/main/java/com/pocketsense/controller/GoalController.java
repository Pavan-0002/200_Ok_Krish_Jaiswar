package com.pocketsense.controller;

import com.pocketsense.dto.GoalRequest;
import com.pocketsense.dto.GoalResponse;
import com.pocketsense.service.GoalService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/goals")
public class GoalController {

    private static final Logger logger = LoggerFactory.getLogger(GoalController.class);

    @Autowired
    private GoalService goalService;

    @PostMapping("/setGoal")
    public ResponseEntity<?> setGoal(@RequestBody GoalRequest request) {
        try {
            if (request == null || request.getUserId() == null || request.getTargetAmount() == null) {
                return ResponseEntity.badRequest().body("Invalid goal data");
            }
            goalService.saveGoal(request);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error setting goal: ", e);
            return ResponseEntity.internalServerError().body("Failed to sync goal");
        }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getGoal(@PathVariable UUID userId) {
        try {
            if (userId == null) return ResponseEntity.badRequest().body("User ID required");
            GoalResponse response = goalService.getGoalResponse(userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error fetching goal for user {}: ", userId, e);
            return ResponseEntity.internalServerError().body("Error fetching strategy data");
        }
    }
}
