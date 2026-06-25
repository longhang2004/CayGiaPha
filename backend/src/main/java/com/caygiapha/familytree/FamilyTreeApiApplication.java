package com.caygiapha.familytree;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Vietnamese Family Tree (Cay Gia Pha) REST API.
 *
 * <p>The backend is layered into controller (REST), service (domain logic), and repository
 * (Spring Data JPA) packages per the design document.
 */
@SpringBootApplication
@EnableScheduling
public class FamilyTreeApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(FamilyTreeApiApplication.class, args);
    }
}
