package com.caygiapha.familytree.demo;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.demo")
public record DemoProperties(boolean seed, String email, String password) {

    public DemoProperties {
        email = email == null || email.isBlank() ? "seed@caygiapha.local" : email;
        password = password == null || password.isBlank() ? "SeedFamily-2026!" : password;
    }
}
