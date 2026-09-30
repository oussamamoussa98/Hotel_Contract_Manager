package com.travelagency.contractmanager.domain.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.travelagency.contractmanager.domain.enums.EntryStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Contract Entity.
 * Represents an agreement entered with a hotel, tracking dates, entry status, payment conditions, and file attachments.
 */
@Entity
@Table(
    name = "contracts",
    indexes = {
        @Index(name = "idx_contracts_hotel_id", columnList = "hotel_id"),
        @Index(name = "idx_contracts_entry_status", columnList = "entry_status"),
        @Index(name = "idx_contracts_reception_date", columnList = "reception_date"),
        @Index(name = "idx_contracts_contract_date", columnList = "contract_date")
    }
)
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Hotel is required")
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "hotel_id", nullable = false, foreignKey = @ForeignKey(name = "fk_contracts_hotel"))
    @JsonIgnoreProperties("contracts")
    private Hotel hotel;

    @NotNull(message = "Contract date is required")
    @Column(name = "contract_date", nullable = false)
    private LocalDate contractDate;

    @NotNull(message = "Reception date is required")
    @Column(name = "reception_date", nullable = false)
    private LocalDate receptionDate;

    @NotNull(message = "Entry status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "entry_status", nullable = false, length = 30)
    private EntryStatus entryStatus = EntryStatus.NON_SAISI;

    @Column(name = "payment_terms", columnDefinition = "TEXT")
    private String paymentTerms;

    @Size(max = 255)
    @Column(name = "file_name", length = 255)
    private String fileName;

    @Size(max = 500)
    @Column(name = "file_path", length = 500)
    private String filePath;

    @Size(max = 100)
    @Column(name = "file_type", length = 100)
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Contract() {
    }

    public Contract(Hotel hotel, LocalDate contractDate, LocalDate receptionDate, EntryStatus entryStatus, String paymentTerms) {
        this.hotel = hotel;
        this.contractDate = contractDate;
        this.receptionDate = receptionDate;
        this.entryStatus = entryStatus;
        this.paymentTerms = paymentTerms;
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

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Hotel getHotel() {
        return hotel;
    }

    public void setHotel(Hotel hotel) {
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Contract contract = (Contract) o;
        return Objects.equals(id, contract.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Contract{" +
                "id=" + id +
                ", hotel=" + (hotel != null ? hotel.getName() : "null") +
                ", contractDate=" + contractDate +
                ", receptionDate=" + receptionDate +
                ", entryStatus=" + entryStatus +
                ", fileName='" + fileName + '\'' +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
