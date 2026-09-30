package com.travelagency.contractmanager;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.EntryStatus;
import com.travelagency.contractmanager.domain.enums.Region;
import com.travelagency.contractmanager.dto.request.ContractRequest;
import com.travelagency.contractmanager.dto.request.HotelRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ContractManagerApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Nested
    @DisplayName("Hotel API Tests")
    class HotelApiTests {

        @Test
        @DisplayName("POST /api/hotels - Should successfully create hotel")
        void testCreateHotel() throws Exception {
            HotelRequest request = new HotelRequest("Iberostar Selection Kantaoui Bay", Region.SOUSSE, Chain.IBEROSTAR);

            mockMvc.perform(post("/api/hotels")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", notNullValue()))
                    .andExpect(jsonPath("$.name", is("Iberostar Selection Kantaoui Bay")))
                    .andExpect(jsonPath("$.region", is("SOUSSE")))
                    .andExpect(jsonPath("$.regionDisplayName", is("Sousse")))
                    .andExpect(jsonPath("$.chain", is("IBEROSTAR")))
                    .andExpect(jsonPath("$.chainDisplayName", is("Iberostar")));
        }

        @Test
        @DisplayName("GET /api/hotels - Should return all hotels")
        void testGetAllHotels() throws Exception {
            mockMvc.perform(get("/api/hotels"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))))
                    .andExpect(jsonPath("$[0].id", notNullValue()))
                    .andExpect(jsonPath("$[0].name", notNullValue()));
        }

        @Test
        @DisplayName("GET /api/hotels/{id} - Should return single hotel")
        void testGetHotelById() throws Exception {
            mockMvc.perform(get("/api/hotels/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(1)))
                    .andExpect(jsonPath("$.name", notNullValue()));
        }

        @Test
        @DisplayName("PUT /api/hotels/{id} - Should update existing hotel")
        void testUpdateHotel() throws Exception {
            HotelRequest updateRequest = new HotelRequest("Iberostar Averroes Updated", Region.HAMMAMET, Chain.IBEROSTAR);

            mockMvc.perform(put("/api/hotels/1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name", is("Iberostar Averroes Updated")));
        }

        @Test
        @DisplayName("DELETE /api/hotels/{id} - Should delete hotel")
        void testDeleteHotel() throws Exception {
            // First create a hotel to delete
            HotelRequest request = new HotelRequest("Hotel To Delete", Region.TABARKA, Chain.INDEPENDANT);
            String response = mockMvc.perform(post("/api/hotels")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andReturn().getResponse().getContentAsString();

            Number newId = com.jayway.jsonpath.JsonPath.read(response, "$.id");

            mockMvc.perform(delete("/api/hotels/" + newId))
                    .andExpect(status().isNoContent());

            mockMvc.perform(get("/api/hotels/" + newId))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("Contract API Tests")
    class ContractApiTests {

        @Test
        @DisplayName("POST /api/contracts - Should successfully create contract")
        void testCreateContract() throws Exception {
            ContractRequest request = new ContractRequest(
                    1L,
                    LocalDate.of(2026, 2, 1),
                    LocalDate.of(2026, 2, 5),
                    EntryStatus.NON_SAISI,
                    "30 jours après facture"
            );
            request.setFileName("contrat_sousse_2026.pdf");

            mockMvc.perform(post("/api/contracts")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", notNullValue()))
                    .andExpect(jsonPath("$.hotel.id", is(1)))
                    .andExpect(jsonPath("$.entryStatus", is("NON_SAISI")))
                    .andExpect(jsonPath("$.statusLabel", is("Non Saisi")))
                    .andExpect(jsonPath("$.statusBadgeColor", is("red")))
                    .andExpect(jsonPath("$.paymentTerms", is("30 jours après facture")));
        }

        @Test
        @DisplayName("GET /api/contracts - Should return all contracts")
        void testGetContracts() throws Exception {
            mockMvc.perform(get("/api/contracts"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                    .andExpect(jsonPath("$[0].hotel", notNullValue()))
                    .andExpect(jsonPath("$[0].entryStatus", notNullValue()));
        }

        @Test
        @DisplayName("GET /api/contracts/{id} - Should return single contract")
        void testGetContractById() throws Exception {
            mockMvc.perform(get("/api/contracts/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(1)))
                    .andExpect(jsonPath("$.hotel", notNullValue()))
                    .andExpect(jsonPath("$.entryStatus", notNullValue()));
        }

        @Test
        @DisplayName("PUT /api/contracts/{id} - Should update contract status and details")
        void testUpdateContract() throws Exception {
            ContractRequest updateRequest = new ContractRequest();
            updateRequest.setEntryStatus(EntryStatus.SAISI);
            updateRequest.setPaymentTerms("Paiement comptant à réception");

            mockMvc.perform(put("/api/contracts/3")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(3)))
                    .andExpect(jsonPath("$.entryStatus", is("SAISI")))
                    .andExpect(jsonPath("$.statusLabel", is("Saisi")))
                    .andExpect(jsonPath("$.statusBadgeColor", is("green")))
                    .andExpect(jsonPath("$.paymentTerms", is("Paiement comptant à réception")));
        }

        @Test
        @DisplayName("DELETE /api/contracts/{id} - Should delete contract")
        void testDeleteContract() throws Exception {
            // Create a contract to delete
            ContractRequest request = new ContractRequest(
                    1L,
                    LocalDate.of(2026, 3, 1),
                    LocalDate.of(2026, 3, 2),
                    EntryStatus.XML,
                    "Conditions XML"
            );

            String response = mockMvc.perform(post("/api/contracts")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andReturn().getResponse().getContentAsString();

            Number newId = com.jayway.jsonpath.JsonPath.read(response, "$.id");

            mockMvc.perform(delete("/api/contracts/" + newId))
                    .andExpect(status().isNoContent());

            mockMvc.perform(get("/api/contracts/" + newId))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("Filtering & Search Tests")
    class FilteringAndSearchTests {

        @Test
        @DisplayName("GET /api/contracts?region=HAMMAMET - Filter by region")
        void testFilterByRegion() throws Exception {
            mockMvc.perform(get("/api/contracts").param("region", "HAMMAMET"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                    .andExpect(jsonPath("$[*].hotel.region", everyItem(is("HAMMAMET"))));
        }

        @Test
        @DisplayName("GET /api/contracts?chain=IBEROSTAR - Filter by chain")
        void testFilterByChain() throws Exception {
            mockMvc.perform(get("/api/contracts").param("chain", "IBEROSTAR"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                    .andExpect(jsonPath("$[*].hotel.chain", everyItem(is("IBEROSTAR"))));
        }

        @Test
        @DisplayName("GET /api/contracts?status=NON_SAISI - Filter by status")
        void testFilterByStatus() throws Exception {
            mockMvc.perform(get("/api/contracts").param("status", "NON_SAISI"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                    .andExpect(jsonPath("$[*].entryStatus", everyItem(is("NON_SAISI"))));
        }

        @Test
        @DisplayName("GET /api/contracts?hotel=iber - Partial name search ('iber' finds 'Iberostar Averroes')")
        void testSearchByPartialHotelName() throws Exception {
            mockMvc.perform(get("/api/contracts").param("hotel", "iber"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                    .andExpect(jsonPath("$[0].hotel.name", containsStringIgnoringCase("Iberostar")));
        }

        @Test
        @DisplayName("GET /api/contracts?receptionDateFrom=...&receptionDateTo=... - Filter by date range")
        void testFilterByReceptionDateRange() throws Exception {
            mockMvc.perform(get("/api/contracts")
                            .param("receptionDateFrom", "2026-01-01")
                            .param("receptionDateTo", "2026-01-20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
        }

        @Test
        @DisplayName("GET /api/contracts?region=DJERBA&chain=HASDRUBAL&status=NON_SAISI - Combined multi-criteria filter")
        void testCombinedFilters() throws Exception {
            mockMvc.perform(get("/api/contracts")
                            .param("region", "DJERBA")
                            .param("chain", "HASDRUBAL")
                            .param("status", "NON_SAISI"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].hotel.region", is("DJERBA")))
                    .andExpect(jsonPath("$[0].hotel.chain", is("HASDRUBAL")))
                    .andExpect(jsonPath("$[0].entryStatus", is("NON_SAISI")));
        }
    }

    @Nested
    @DisplayName("Validation Tests")
    class ValidationTests {

        @Test
        @DisplayName("POST /api/hotels with missing required fields should return 400 Bad Request")
        void testHotelValidation() throws Exception {
            HotelRequest invalidRequest = new HotelRequest("", null, null);

            mockMvc.perform(post("/api/hotels")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.validationErrors.name", notNullValue()))
                    .andExpect(jsonPath("$.validationErrors.region", notNullValue()))
                    .andExpect(jsonPath("$.validationErrors.chain", notNullValue()));
        }

        @Test
        @DisplayName("POST /api/contracts with missing required fields should return 400 Bad Request")
        void testContractValidation() throws Exception {
            ContractRequest invalidRequest = new ContractRequest();

            mockMvc.perform(post("/api/contracts")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.validationErrors.contractDate", notNullValue()))
                    .andExpect(jsonPath("$.validationErrors.receptionDate", notNullValue()))
                    .andExpect(jsonPath("$.validationErrors.entryStatus", notNullValue()));
        }

        @Test
        @DisplayName("GET /api/hotels/999999 should return 404 Not Found")
        void testHotelNotFound() throws Exception {
            mockMvc.perform(get("/api/hotels/999999"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status", is(404)))
                    .andExpect(jsonPath("$.message", containsString("Hôtel introuvable")));
        }

        @Test
        @DisplayName("GET /api/contracts/999999 should return 404 Not Found")
        void testContractNotFound() throws Exception {
            mockMvc.perform(get("/api/contracts/999999"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status", is(404)))
                    .andExpect(jsonPath("$.message", containsString("Contrat introuvable")));
        }
    }
}
