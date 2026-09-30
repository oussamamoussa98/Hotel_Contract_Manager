package com.travelagency.contractmanager.service.impl;

import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.EntryStatus;
import com.travelagency.contractmanager.domain.enums.Region;
import com.travelagency.contractmanager.domain.model.Contract;
import com.travelagency.contractmanager.domain.model.Hotel;
import com.travelagency.contractmanager.dto.request.ContractRequest;
import com.travelagency.contractmanager.dto.response.ContractResponse;
import com.travelagency.contractmanager.exception.ResourceNotFoundException;
import com.travelagency.contractmanager.repository.ContractRepository;
import com.travelagency.contractmanager.repository.HotelRepository;
import com.travelagency.contractmanager.service.ContractService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ContractServiceImpl implements ContractService {

    private final ContractRepository contractRepository;
    private final HotelRepository hotelRepository;

    public ContractServiceImpl(ContractRepository contractRepository, HotelRepository hotelRepository) {
        this.contractRepository = contractRepository;
        this.hotelRepository = hotelRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContractResponse> getContracts(
            Region region,
            Chain chain,
            EntryStatus status,
            String hotel,
            LocalDate receptionDateFrom,
            LocalDate receptionDateTo
    ) {
        Specification<Contract> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            jakarta.persistence.criteria.Join<Contract, Hotel> hotelJoin = root.join("hotel", jakarta.persistence.criteria.JoinType.LEFT);

            if (region != null) {
                predicates.add(cb.equal(hotelJoin.get("region"), region));
            }
            if (chain != null) {
                predicates.add(cb.equal(hotelJoin.get("chain"), chain));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("entryStatus"), status));
            }
            if (hotel != null && !hotel.trim().isEmpty()) {
                String pattern = "%" + hotel.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(hotelJoin.get("name")), pattern));
            }
            if (receptionDateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("receptionDate"), receptionDateFrom));
            }
            if (receptionDateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("receptionDate"), receptionDateTo));
            }

            query.orderBy(cb.desc(root.get("receptionDate")), cb.desc(root.get("createdAt")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return contractRepository.findAll(spec).stream()
                .map(ContractResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ContractResponse getContractById(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrat introuvable avec l'ID: " + id));
        return ContractResponse.fromEntity(contract);
    }

    @Override
    public ContractResponse createContract(ContractRequest request) {
        Hotel hotel = resolveHotel(request);

        // Validation of required fields
        if (request.getContractDate() == null) {
            throw new IllegalArgumentException("La date du contrat est obligatoire");
        }
        if (request.getReceptionDate() == null) {
            throw new IllegalArgumentException("La date de réception est obligatoire");
        }
        if (request.getEntryStatus() == null) {
            throw new IllegalArgumentException("Le statut de saisie est obligatoire");
        }

        Contract contract = new Contract(
                hotel,
                request.getContractDate(),
                request.getReceptionDate(),
                request.getEntryStatus(),
                request.getPaymentTerms()
        );

        contract.setFileName(request.getFileName());
        contract.setFilePath(request.getFilePath());
        contract.setFileType(request.getFileType());
        contract.setFileSize(request.getFileSize());

        Contract savedContract = contractRepository.save(contract);
        return ContractResponse.fromEntity(savedContract);
    }

    @Override
    public ContractResponse updateContract(Long id, ContractRequest request) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrat introuvable avec l'ID: " + id));

        if (request.getHotelId() != null || request.getHotel() != null) {
            Hotel hotel = resolveHotel(request);
            contract.setHotel(hotel);
        }

        if (request.getContractDate() != null) {
            contract.setContractDate(request.getContractDate());
        }
        if (request.getReceptionDate() != null) {
            contract.setReceptionDate(request.getReceptionDate());
        }
        if (request.getEntryStatus() != null) {
            contract.setEntryStatus(request.getEntryStatus());
        }
        if (request.getPaymentTerms() != null) {
            contract.setPaymentTerms(request.getPaymentTerms());
        }
        if (request.getFileName() != null) {
            contract.setFileName(request.getFileName());
        }
        if (request.getFilePath() != null) {
            contract.setFilePath(request.getFilePath());
        }
        if (request.getFileType() != null) {
            contract.setFileType(request.getFileType());
        }
        if (request.getFileSize() != null) {
            contract.setFileSize(request.getFileSize());
        }

        Contract updatedContract = contractRepository.save(contract);
        return ContractResponse.fromEntity(updatedContract);
    }

    @Override
    public void deleteContract(Long id) {
        if (!contractRepository.existsById(id)) {
            throw new ResourceNotFoundException("Contrat introuvable avec l'ID: " + id);
        }
        contractRepository.deleteById(id);
    }

    private Hotel resolveHotel(ContractRequest request) {
        if (request.getHotelId() != null) {
            return hotelRepository.findById(request.getHotelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Hôtel introuvable avec l'ID: " + request.getHotelId()));
        }

        if (request.getHotel() != null) {
            if (request.getHotel().getName() == null || request.getHotel().getName().isBlank()) {
                throw new IllegalArgumentException("Le nom de l'hôtel est obligatoire");
            }
            if (request.getHotel().getRegion() == null) {
                throw new IllegalArgumentException("La région de l'hôtel est obligatoire");
            }
            if (request.getHotel().getChain() == null) {
                throw new IllegalArgumentException("La chaîne de l'hôtel est obligatoire");
            }
            Hotel newHotel = new Hotel(
                    request.getHotel().getName(),
                    request.getHotel().getRegion(),
                    request.getHotel().getChain()
            );
            return hotelRepository.save(newHotel);
        }

        throw new IllegalArgumentException("L'hôtel est obligatoire (fournir hotelId ou l'objet hotel)");
    }
}
