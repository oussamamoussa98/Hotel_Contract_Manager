package com.travelagency.contractmanager.dto.response;

import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.Region;
import com.travelagency.contractmanager.domain.model.Hotel;

import java.time.LocalDateTime;

public class HotelResponse {

    private Long id;
    private String name;
    private Region region;
    private String regionDisplayName;
    private Chain chain;
    private String chainDisplayName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int contractCount;

    public HotelResponse() {
    }

    public static HotelResponse fromEntity(Hotel hotel) {
        if (hotel == null) return null;
        HotelResponse response = new HotelResponse();
        response.setId(hotel.getId());
        response.setName(hotel.getName());
        response.setRegion(hotel.getRegion());
        response.setRegionDisplayName(hotel.getRegion() != null ? hotel.getRegion().getDisplayName() : null);
        response.setChain(hotel.getChain());
        response.setChainDisplayName(hotel.getChain() != null ? hotel.getChain().getDisplayName() : null);
        response.setCreatedAt(hotel.getCreatedAt());
        response.setUpdatedAt(hotel.getUpdatedAt());
        response.setContractCount(hotel.getContracts() != null ? hotel.getContracts().size() : 0);
        return response;
    }

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

    public String getRegionDisplayName() {
        return regionDisplayName;
    }

    public void setRegionDisplayName(String regionDisplayName) {
        this.regionDisplayName = regionDisplayName;
    }

    public Chain getChain() {
        return chain;
    }

    public void setChain(Chain chain) {
        this.chain = chain;
    }

    public String getChainDisplayName() {
        return chainDisplayName;
    }

    public void setChainDisplayName(String chainDisplayName) {
        this.chainDisplayName = chainDisplayName;
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

    public int getContractCount() {
        return contractCount;
    }

    public void setContractCount(int contractCount) {
        this.contractCount = contractCount;
    }
}
