package com.travelagency.contractmanager.repository;

import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.EntryStatus;
import com.travelagency.contractmanager.domain.enums.Region;
import com.travelagency.contractmanager.domain.model.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long>, JpaSpecificationExecutor<Contract> {

    List<Contract> findByEntryStatus(EntryStatus entryStatus);

    List<Contract> findByHotelId(Long hotelId);

    List<Contract> findByHotelRegion(Region region);

    List<Contract> findByHotelChain(Chain chain);

    List<Contract> findByReceptionDateBetween(LocalDate startDate, LocalDate endDate);

    /**
     * Optimized multi-criteria filter query for rapid data-entry agent tracking.
     */
    @Query("SELECT c FROM Contract c " +
           "WHERE (:status IS NULL OR c.entryStatus = :status) " +
           "AND (:region IS NULL OR c.hotel.region = :region) " +
           "AND (:chain IS NULL OR c.hotel.chain = :chain) " +
           "AND (:hotelQuery IS NULL OR LOWER(c.hotel.name) LIKE LOWER(CONCAT('%', :hotelQuery, '%'))) " +
           "ORDER BY c.receptionDate DESC, c.createdAt DESC")
    List<Contract> searchContracts(
            @Param("status") EntryStatus status,
            @Param("region") Region region,
            @Param("chain") Chain chain,
            @Param("hotelQuery") String hotelQuery
    );
}
