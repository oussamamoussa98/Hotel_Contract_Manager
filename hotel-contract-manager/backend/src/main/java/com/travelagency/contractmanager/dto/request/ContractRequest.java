package com.travelagency.contractmanager.dto.request;

import com.travelagency.contractmanager.domain.enums.EntryStatus;
import com.travelagency.contractmanager.domain.enums.Region;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class ContractRequest {

    private Long hotelId;

    private HotelRequest hotel;

    private Region region;

    @NotNull(message = "La date du contrat est requise")
    private LocalDate contractDate;

    @NotNull(message = "La date de réception est requise")
    private LocalDate receptionDate;

    @NotNull(message = "Le statut de saisie est requis")
    private EntryStatus entryStatus;

    private String paymentTerms;

    @Size(max = 255)
    private String fileName;

    @Size(max = 500)
    private String filePath;

    @Size(max = 100)
    private String fileType;

    private Long fileSize;

    public ContractRequest() {
    }

    public ContractRequest(Long hotelId, LocalDate contractDate, LocalDate receptionDate, EntryStatus entryStatus, String paymentTerms) {
        this.hotelId = hotelId;
        this.contractDate = contractDate;
        this.receptionDate = receptionDate;
        this.entryStatus = entryStatus;
        this.paymentTerms = paymentTerms;
    }

    public Long getHotelId() {
        return hotelId;
    }

    public void setHotelId(Long hotelId) {
        this.hotelId = hotelId;
    }

    public HotelRequest getHotel() {
        return hotel;
    }

    public void setHotel(HotelRequest hotel) {
        this.hotel = hotel;
    }

    public Region getRegion() {
        return region;
    }

    public void setRegion(Region region) {
        this.region = region;
    }

    public LocalDate getContractDate() {
        return contractDate;
    }

    public void setContractDate(LocalDate contractDate) {
        this.contractDate = contractDate;
    }

    public LocalDate getReceptionDate() {
        return receptionDate;
    }

    public void setReceptionDate(LocalDate receptionDate) {
        this.receptionDate = receptionDate;
    }

    public EntryStatus getEntryStatus() {
        return entryStatus;
    }

    public void setEntryStatus(EntryStatus entryStatus) {
        this.entryStatus = entryStatus;
    }

    public String getPaymentTerms() {
        return paymentTerms;
    }

    public void setPaymentTerms(String paymentTerms) {
        this.paymentTerms = paymentTerms;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }
}
