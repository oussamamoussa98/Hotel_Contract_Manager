package com.travelagency.contractmanager.domain.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.Region;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Hotel Entity.
 * Represents a hotel partner.
 * Note: The hotel name is NOT unique because the same hotel may have records or contracts across seasons/years.
 */
@Entity
@Table(
    name = "hotels",
    indexes = {
        @Index(name = "idx_hotels_region", columnList = "region"),
        @Index(name = "idx_hotels_chain", columnList = "chain"),
        @Index(name = "idx_hotels_name", columnList = "name")
    }
)
public class Hotel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Hotel name is required")
    @Size(max = 150, message = "Hotel name cannot exceed 150 characters")
    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @NotNull(message = "Region is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "region", nullable = false, length = 50)
    private Region region;

    @NotNull(message = "Hotel chain is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "chain", nullable = false, length = 50)
    private Chain chain;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "hotel", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnoreProperties("hotel")
    private List<Contract> contracts = new ArrayList<>();

    public Hotel() {
    }

    public Hotel(String name, Region region, Chain chain) {
        this.name = name;
        this.region = region;
        this.chain = chain;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper methods for bidirectional relationship
    public void addContract(Contract contract) {
        contracts.add(contract);
        contract.setHotel(this);
    }

    public void removeContract(Contract contract) {
        contracts.remove(contract);
        contract.setHotel(null);
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Region getRegion() {
        return region;
    }

    public void setRegion(Region region) {
        this.region = region;
    }

    public Chain getChain() {
        return chain;
    }

    public void setChain(Chain chain) {
        this.chain = chain;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<Contract> getContracts() {
        return contracts;
    }

    public void setContracts(List<Contract> contracts) {
        this.contracts = contracts;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Hotel hotel = (Hotel) o;
        return Objects.equals(id, hotel.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Hotel{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", region=" + region +
                ", chain=" + chain +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
