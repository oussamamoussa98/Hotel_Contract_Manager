package com.travelagency.contractmanager.domain.enums;

/**
 * Predefined hotel regions for Hotel Contract Manager.
 */
public enum Region {
    HAMMAMET("Hammamet"),
    MAHDIA("Mahdia"),
    SOUSSE("Sousse"),
    MONASTIR("Monastir"),
    DJERBA("Djerba"),
    SFAX("Sfax"),
    TUNIS("Tunis"),
    TABARKA("Tabarka"),
    DOUZ("Douz"),
    TOZEUR("Tozeur"),
    BIZERTE("Bizerte"),
    KAIROUAN("Kairouan"),
    DIVERS("Divers");

    private final String displayName;

    Region(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
