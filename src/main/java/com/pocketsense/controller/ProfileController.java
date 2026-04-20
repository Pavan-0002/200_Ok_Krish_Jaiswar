package com.pocketsense.controller;

import com.pocketsense.dto.ProfileRequest;
import com.pocketsense.model.Profile;
import com.pocketsense.service.ProfileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class ProfileController {

    private static final Logger logger = LoggerFactory.getLogger(ProfileController.class);

    @Autowired
    private ProfileService profileService;

    @PostMapping("/profile")
    public ResponseEntity<?> saveProfile(@RequestBody ProfileRequest request) {
        try {
            if (request == null || request.getUserId() == null) {
                return ResponseEntity.badRequest().body("Profile data and User ID are required");
            }
            Profile profile = profileService.saveOrUpdateProfile(request);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            logger.error("Error saving profile: ", e);
            return ResponseEntity.internalServerError().body("Error updating profile");
        }
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<?> getProfile(@PathVariable UUID userId) {
        try {
            if (userId == null) return ResponseEntity.badRequest().body("User ID is required");
            Profile profile = profileService.getProfileByUserId(userId);
            if(profile != null) {
                return ResponseEntity.ok(profile);
            } else {
                Profile emptyProfile = new Profile();
                emptyProfile.setUserId(userId);
                emptyProfile.setName("New User");
                emptyProfile.setMonthlyBudget(5000.0);
                emptyProfile.setSavingsGoal(20000.0);
                return ResponseEntity.ok(emptyProfile);
            }
        } catch (Exception e) {
            logger.error("Error fetching profile for user {}: ", userId, e);
            return ResponseEntity.internalServerError().body("Error fetching profile data");
        }
    }


}
