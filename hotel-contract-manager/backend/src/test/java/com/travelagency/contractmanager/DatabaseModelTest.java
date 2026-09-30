package com.travelagency.contractmanager;

import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.EntryStatus;
import com.travelagency.contractmanager.domain.enums.Region;
import com.travelagency.contractmanager.domain.model.Contract;
import com.travelagency.contractmanager.domain.model.Hotel;
import com.travelagency.contractmanager.repository.ContractRepository;
import com.travelagency.contractmanager.repository.HotelRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class DatabaseModelTest {

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private ContractRepository contractRepository;

    @Test
    @DisplayName("Context loads and initial demo test data is seeded properly")
    void testInitialDataLoaded() {
        List<Hotel> hotels = hotelRepository.findAll();
        assertThat(hotels).isNotEmpty();
        assertThat(hotels).hasSizeGreaterThanOrEqualTo(3);

        List<Contract> contracts = contractRepository.findAll();
        assertThat(contracts).isNotEmpty();
        assertThat(contracts).hasSizeGreaterThanOrEqualTo(5);

        // Verify Demo Hotel 1: Hammamet
        List<Hotel> hammametHotels = hotelRepository.findByRegion(Region.HAMMAMET);
        assertThat(hammametHotels).anyMatch(h -> h.getName().contains("Averroes"));

        // Verify Statuses exist in demo data
        List<Contract> saisiContracts = contractRepository.findByEntryStatus(EntryStatus.SAISI);
        List<Contract> xmlContracts = contractRepository.findByEntryStatus(EntryStatus.XML);
        List<Contract> nonSaisiContracts = contractRepository.findByEntryStatus(EntryStatus.NON_SAISI);

        assertThat(saisiContracts).isNotEmpty();
        assertThat(xmlContracts).isNotEmpty();
        assertThat(nonSaisiContracts).isNotEmpty();
    }

    @Test
    @DisplayName("Hotel 1 -> N Contracts relationship persists and cascades correctly")
    void testHotelContractRelationship() {
        Hotel newHotel = new Hotel("Hotel Test Monastir", Region.MONASTIR, Chain.VINCCI);
        Hotel savedHotel = hotelRepository.save(newHotel);

        assertThat(savedHotel.getId()).isNotNull();
        assertThat(savedHotel.getCreatedAt()).isNotNull();
        assertThat(savedHotel.getUpdatedAt()).isNotNull();

        Contract contract2025 = new Contract(
                savedHotel,
                LocalDate.of(2025, 6, 1),
                LocalDate.of(2025, 6, 5),
                EntryStatus.SAISI,
                "Virement 30 jours"
        );
        contract2025.setFileName("contrat_vincci_2025.pdf");

        Contract contract2026 = new Contract(
                savedHotel,
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 6, 4),
                EntryStatus.NON_SAISI,
                "Paiement comptant"
        );

        contractRepository.save(contract2025);
        contractRepository.save(contract2026);

        List<Contract> hotelContracts = contractRepository.findByHotelId(savedHotel.getId());
        assertThat(hotelContracts).hasSize(2);
        assertThat(hotelContracts).extracting(Contract::getEntryStatus)
                .containsExactlyInAnyOrder(EntryStatus.SAISI, EntryStatus.NON_SAISI);
    }

    @Test
    @DisplayName("Hotel name is NOT unique - multiple hotels or seasons allowed")
    void testDuplicateHotelNameAllowed() {
        Hotel h1 = new Hotel("Hotel Bel Azur", Region.HAMMAMET, Chain.AZUR);
        Hotel h2 = new Hotel("Hotel Bel Azur", Region.HAMMAMET, Chain.AZUR);

        Hotel savedH1 = hotelRepository.save(h1);
        Hotel savedH2 = hotelRepository.save(h2);

        assertThat(savedH1.getId()).isNotEqualTo(savedH2.getId());
        assertThat(savedH1.getName()).isEqualTo(savedH2.getName());
    }

    @Test
    @DisplayName("Filtering by region, chain, status, and hotel search works via repository")
    void testRepositoryFilteringAndSearching() {
        // Search by hotel name query
        List<Contract> searchResults = contractRepository.searchContracts(null, null, null, "sousse");
        assertThat(searchResults).isNotEmpty();
        assertThat(searchResults.get(0).getHotel().getName()).containsIgnoringCase("Sousse");

        // Filter by Region
        List<Contract> djerbaContracts = contractRepository.searchContracts(null, Region.DJERBA, null, null);
        assertThat(djerbaContracts).allMatch(c -> c.getHotel().getRegion() == Region.DJERBA);

        // Filter by Chain
        List<Contract> iberostarContracts = contractRepository.searchContracts(null, null, Chain.IBEROSTAR, null);
        assertThat(iberostarContracts).allMatch(c -> c.getHotel().getChain() == Chain.IBEROSTAR);

        // Filter by Status
        List<Contract> xmlContracts = contractRepository.searchContracts(EntryStatus.XML, null, null, null);
        assertThat(xmlContracts).allMatch(c -> c.getEntryStatus() == EntryStatus.XML);
    }
}
