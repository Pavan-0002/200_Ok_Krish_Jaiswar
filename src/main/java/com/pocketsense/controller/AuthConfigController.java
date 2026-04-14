package com.pocketsense.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
public class AuthConfigController {

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.key:}")
    private String supabaseKey;

    @GetMapping("/auth-config")
    public Map<String, String> getAuthConfig() {
        Map<String, String> config = new HashMap<>();
        config.put("url", supabaseUrl);
        config.put("key", supabaseKey);
        return config;
    }
}
