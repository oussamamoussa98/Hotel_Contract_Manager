package com.travelagency.contractmanager.domain.enums;

/**
 * Predefined hotel chains for Hotel Contract Manager.
 */
public enum Chain {
    IBEROSTAR("Iberostar"),
    EL_MOURADI("El Mouradi"),
    BHR("BHR"),
    KHAYAM("Khayam"),
    MARHABA("Marhaba"),
    AZUR("Azur"),
    VINCCI("Vincci"),
    TMK("TMK"),
    HASDRUBAL("Hasdrubal"),
    TTS("TTS"),
    MEDINA("Medina"),
    MAGIC_LIFE("Magic Life"),
    THALASSA("Thalassa"),
    MZABI("Mzabi"),
    CONCORDE("Concorde"),
    SHT("SHT"),
    INDEPENDANT("Indépendant / Autre");

    private final String displayName;

    Chain(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
