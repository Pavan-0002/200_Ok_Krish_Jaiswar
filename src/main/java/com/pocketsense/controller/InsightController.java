package com.pocketsense.controller;

import com.pocketsense.dto.InsightResponse;
import com.pocketsense.service.InsightService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/insights")
public class InsightController {

    private static final Logger logger = LoggerFactory.getLogger(InsightController.class);

    @Autowired
    private InsightService insightService;

    @Autowired
    private com.pocketsense.service.ExpenseService expenseService;

    @GetMapping("/{userId}")
    public ResponseEntity<?> getInsights(@PathVariable UUID userId) {
        try {
            if (userId == null) return ResponseEntity.badRequest().body("User ID is required");
            
            // Get base insights
            InsightResponse response = insightService.getInsights(userId);
            
            // Get expenses to calculate additional metrics
            java.util.List<com.pocketsense.model.Expense> expenses = expenseService.getExpensesByUserId(userId);
            
            double totalSpending = expenses.stream().mapToDouble(com.pocketsense.model.Expense::getAmount).sum();
            double regretSpending = expenses.stream()
                    .filter(e -> Boolean.TRUE.equals(e.getIsRegret()))
                    .mapToDouble(com.pocketsense.model.Expense::getAmount).sum();
            
            int healthScore = 100;
            if (totalSpending > 0) {
                healthScore = (int) Math.max(0, 100 - (regretSpending / totalSpending * 100));
            }

            response.setTotalSpending(totalSpending);
            response.setRegretSpending(regretSpending);
            response.setHealthScore(healthScore);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error fetching insights for user {}: ", userId, e);
            return ResponseEntity.internalServerError().body("Error processing insights");
        }
    }

    @GetMapping("/health/{userId}")
    public ResponseEntity<?> getHealthScore(@PathVariable UUID userId) {
        try {
            if (userId == null) return ResponseEntity.badRequest().body("User ID is required");
            return ResponseEntity.ok(insightService.getHealthScore(userId));
        } catch (Exception e) {
            logger.error("Error fetching health score for user {}: ", userId, e);
            return ResponseEntity.internalServerError().body("Error processing health score");
        }
    }

    @GetMapping("/prediction/{userId}")
    public ResponseEntity<?> getPrediction(@PathVariable UUID userId) {
        try {
            if (userId == null) return ResponseEntity.badRequest().body("User ID is required");
            return ResponseEntity.ok(insightService.getPrediction(userId));
        } catch (Exception e) {
            logger.error("Error fetching prediction for user {}: ", userId, e);
            return ResponseEntity.internalServerError().body("Error processing prediction");
        }
    }

    @GetMapping("/regret/{userId}")
    public ResponseEntity<?> getRegret(@PathVariable UUID userId) {
        try {
            if (userId == null) return ResponseEntity.badRequest().body("User ID is required");
            return ResponseEntity.ok(insightService.getRegret(userId));
        } catch (Exception e) {
            logger.error("Error fetching regret data for user {}: ", userId, e);
            return ResponseEntity.internalServerError().body("Error processing regret metrics");
        }
    }
}
