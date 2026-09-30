package com.travelagency.contractmanager.dto.request;

import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.Region;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class HotelRequest {

    @NotBlank(message = "Le nom de l'hôtel est obligatoire")
    @Size(max = 150, message = "Le nom de l'hôtel ne peut pas dépasser 150 caractères")
    private String name;

    @NotNull(message = "La région est obligatoire")
    private Region region;

    @NotNull(message = "La chaîne hôtelière est obligatoire")
    private Chain chain;

    public HotelRequest() {
    }

    public HotelRequest(String name, Region region, Chain chain) {
        this.name = name;
        this.region = region;
        this.chain = chain;
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
}
