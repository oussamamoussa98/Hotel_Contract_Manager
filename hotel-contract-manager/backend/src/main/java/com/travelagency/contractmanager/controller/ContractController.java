package com.travelagency.contractmanager.controller;

import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.EntryStatus;
import com.travelagency.contractmanager.domain.enums.Region;
import com.travelagency.contractmanager.dto.request.ContractRequest;
import com.travelagency.contractmanager.dto.response.ContractResponse;
import com.travelagency.contractmanager.service.ContractService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/contracts")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @GetMapping
    public ResponseEntity<List<ContractResponse>> getContracts(
            @RequestParam(required = false) Region region,
            @RequestParam(required = false) Chain chain,
            @RequestParam(required = false) EntryStatus status,
            @RequestParam(required = false) String hotel,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate receptionDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate receptionDateTo
    ) {
        List<ContractResponse> contracts = contractService.getContracts(
                region, chain, status, hotel, receptionDateFrom, receptionDateTo
        );
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContractResponse> getContractById(@PathVariable Long id) {
        return ResponseEntity.ok(contractService.getContractById(id));
    }

    @PostMapping
    public ResponseEntity<ContractResponse> createContract(@Valid @RequestBody ContractRequest request) {
        ContractResponse response = contractService.createContract(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContractResponse> updateContract(
            @PathVariable Long id,
            @RequestBody ContractRequest request
    ) {
        ContractResponse response = contractService.updateContract(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContract(@PathVariable Long id) {
        contractService.deleteContract(id);
        return ResponseEntity.noContent().build();
    }
}
