package com.pocketsense.service;

import com.pocketsense.dto.GoalRequest;
import com.pocketsense.dto.GoalResponse;
import com.pocketsense.model.Goal;
import com.pocketsense.repository.GoalRepository;
import com.pocketsense.repository.SavingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class GoalService {

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private SavingRepository savingRepository;

    public Goal saveGoal(GoalRequest request) {
        List<Goal> existing = goalRepository.findAllByUserId(request.getUserId());
        Goal goal = existing.isEmpty() ? new Goal() : existing.get(0);
        goal.setUserId(request.getUserId());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setDeadline(request.getDeadline());
        // Reset createdAt to now when updating goal to start measuring progress fresh
        goal.setCreatedAt(LocalDate.now());
        return goalRepository.save(goal);
    }

    public List<com.pocketsense.model.Saving> getSavingsByUserId(UUID userId) {
        return savingRepository.findByUserId(userId);
    }

    public com.pocketsense.model.Saving saveSaving(com.pocketsense.dto.SavingRequest request) {
        com.pocketsense.model.Saving saving = new com.pocketsense.model.Saving();
        saving.setUserId(request.getUserId());
        saving.setAmount(request.getAmount());
        saving.setDate(request.getDate() != null ? request.getDate() : LocalDate.now());
        return savingRepository.save(saving);
    }

    public GoalResponse getGoalResponse(UUID userId) {
        List<Goal> goals = goalRepository.findAllByUserId(userId);
        if (goals.isEmpty()) {
            return new GoalResponse(0.0, LocalDate.now(), 0.0, 0.0, 0.0, 0L, 0.0, "No active goal ❌");
        }
        Goal goal = goals.get(goals.size() - 1); 

        List<com.pocketsense.model.Saving> savings = savingRepository.findByUserId(userId);
        double totalSaved = savings.stream().mapToDouble(com.pocketsense.model.Saving::getAmount).sum();
        double remainingAmount = Math.max(0, goal.getTargetAmount() - totalSaved);
        
        long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), goal.getDeadline());
        if (daysRemaining < 0) daysRemaining = 0;

        double progress = 0.0;
        if(goal.getTargetAmount() > 0) {
            progress = (totalSaved / goal.getTargetAmount()) * 100;
        }

        double dailySavingsNeeded = 0.0;
        if (remainingAmount > 0) {
            long divisor = Math.max(1, daysRemaining);
            dailySavingsNeeded = remainingAmount / divisor;
        }
        
        String status = "On Track ✅";
        LocalDate start = goal.getCreatedAt() != null ? goal.getCreatedAt() : LocalDate.now().minusDays(30);
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(start, goal.getDeadline()));
        long elapsedDays = Math.max(0, ChronoUnit.DAYS.between(start, LocalDate.now()));
        double expectedProgress = (double) elapsedDays / totalDays * 100;

        if (progress < expectedProgress * 0.8) {
             status = "Behind ⚠️";
        }
        
        if (remainingAmount > 0 && daysRemaining == 0) status = "Behind ⚠️";

        return new GoalResponse(
                goal.getTargetAmount(),
                goal.getDeadline(),
                totalSaved,
                remainingAmount,
                dailySavingsNeeded,
                daysRemaining,
                Math.min(progress, 100.0),
                status
        );
    }
}
