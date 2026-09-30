package com.travelagency.contractmanager.service;

import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.EntryStatus;
import com.travelagency.contractmanager.domain.enums.Region;
import com.travelagency.contractmanager.dto.request.ContractRequest;
import com.travelagency.contractmanager.dto.response.ContractResponse;

import java.time.LocalDate;
import java.util.List;

public interface ContractService {

    List<ContractResponse> getContracts(
            Region region,
            Chain chain,
            EntryStatus status,
            String hotel,
            LocalDate receptionDateFrom,
            LocalDate receptionDateTo
    );

    ContractResponse getContractById(Long id);

    ContractResponse createContract(ContractRequest request);

    ContractResponse updateContract(Long id, ContractRequest request);

    void deleteContract(Long id);
}
