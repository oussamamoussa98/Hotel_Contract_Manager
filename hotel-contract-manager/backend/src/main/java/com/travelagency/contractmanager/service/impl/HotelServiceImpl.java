package com.travelagency.contractmanager.service.impl;

import com.travelagency.contractmanager.domain.model.Hotel;
import com.travelagency.contractmanager.dto.request.HotelRequest;
import com.travelagency.contractmanager.dto.response.HotelResponse;
import com.travelagency.contractmanager.exception.ResourceNotFoundException;
import com.travelagency.contractmanager.repository.HotelRepository;
import com.travelagency.contractmanager.service.HotelService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class HotelServiceImpl implements HotelService {

    private final HotelRepository hotelRepository;

    public HotelServiceImpl(HotelRepository hotelRepository) {
        this.hotelRepository = hotelRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotelResponse> getAllHotels() {
        return hotelRepository.findAll().stream()
                .map(HotelResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public HotelResponse getHotelById(Long id) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hôtel introuvable avec l'ID: " + id));
        return HotelResponse.fromEntity(hotel);
    }

    @Override
    public HotelResponse createHotel(HotelRequest request) {
        Hotel hotel = new Hotel(request.getName(), request.getRegion(), request.getChain());
        Hotel savedHotel = hotelRepository.save(hotel);
        return HotelResponse.fromEntity(savedHotel);
    }

    @Override
    public HotelResponse updateHotel(Long id, HotelRequest request) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hôtel introuvable avec l'ID: " + id));

        hotel.setName(request.getName());
        hotel.setRegion(request.getRegion());
        hotel.setChain(request.getChain());

        Hotel updatedHotel = hotelRepository.save(hotel);
        return HotelResponse.fromEntity(updatedHotel);
    }

    @Override
    public void deleteHotel(Long id) {
        if (!hotelRepository.existsById(id)) {
            throw new ResourceNotFoundException("Hôtel introuvable avec l'ID: " + id);
        }
        hotelRepository.deleteById(id);
    }
}
