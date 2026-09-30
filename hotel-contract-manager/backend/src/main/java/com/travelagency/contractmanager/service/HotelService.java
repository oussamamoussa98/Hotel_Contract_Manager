package com.travelagency.contractmanager.service;

import com.travelagency.contractmanager.dto.request.HotelRequest;
import com.travelagency.contractmanager.dto.response.HotelResponse;

import java.util.List;

public interface HotelService {

    List<HotelResponse> getAllHotels();

    HotelResponse getHotelById(Long id);

    HotelResponse createHotel(HotelRequest request);

    HotelResponse updateHotel(Long id, HotelRequest request);

    void deleteHotel(Long id);
}
