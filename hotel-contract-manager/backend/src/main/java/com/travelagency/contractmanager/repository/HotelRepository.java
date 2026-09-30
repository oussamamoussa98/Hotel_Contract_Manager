package com.travelagency.contractmanager.repository;

import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.Region;
import com.travelagency.contractmanager.domain.model.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HotelRepository extends JpaRepository<Hotel, Long> {

    List<Hotel> findByRegion(Region region);

    List<Hotel> findByChain(Chain chain);

    List<Hotel> findByNameContainingIgnoreCase(String name);

    List<Hotel> findByRegionAndChain(Region region, Chain chain);
}
