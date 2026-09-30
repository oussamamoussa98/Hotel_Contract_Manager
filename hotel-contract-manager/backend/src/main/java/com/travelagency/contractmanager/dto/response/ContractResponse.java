package com.travelagency.contractmanager.dto.response;

import com.travelagency.contractmanager.domain.enums.EntryStatus;
import com.travelagency.contractmanager.domain.model.Contract;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ContractResponse {

    private Long id;
    private HotelResponse hotel;
    private LocalDate contractDate;
    private LocalDate receptionDate;
    private EntryStatus entryStatus;
    private String statusLabel;
    private String statusBadgeColor;
    private String paymentTerms;
    private String fileName;
    private String filePath;
    private String fileType;
    private Long fileSize;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ContractResponse() {
    }

    public static ContractResponse fromEntity(Contract contract) {
        if (contract == null) return null;
        ContractResponse response = new ContractResponse();
        response.setId(contract.getId());
        response.setHotel(HotelResponse.fromEntity(contract.getHotel()));
        response.setContractDate(contract.getContractDate());
        response.setReceptionDate(contract.getReceptionDate());
        response.setEntryStatus(contract.getEntryStatus());
        if (contract.getEntryStatus() != null) {
            response.setStatusLabel(contract.getEntryStatus().getLabel());
            response.setStatusBadgeColor(contract.getEntryStatus().getBadgeColor());
        }
        response.setPaymentTerms(contract.getPaymentTerms());
        response.setFileName(contract.getFileName());
        response.setFilePath(contract.getFilePath());
        response.setFileType(contract.getFileType());
        response.setFileSize(contract.getFileSize());
        response.setCreatedAt(contract.getCreatedAt());
        response.setUpdatedAt(contract.getUpdatedAt());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public HotelResponse getHotel() {
        return hotel;
    }

    public void setHotel(HotelResponse hotel) {
        this.hotel = hotel;
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

    public String getStatusLabel() {
        return statusLabel;
    }

    public void setStatusLabel(String statusLabel) {
        this.statusLabel = statusLabel;
    }

    public String getStatusBadgeColor() {
        return statusBadgeColor;
    }

    public void setStatusBadgeColor(String statusBadgeColor) {
        this.statusBadgeColor = statusBadgeColor;
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
}
