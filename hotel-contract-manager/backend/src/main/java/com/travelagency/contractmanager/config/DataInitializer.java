package com.travelagency.contractmanager.config;

import com.travelagency.contractmanager.domain.enums.Chain;
import com.travelagency.contractmanager.domain.enums.EntryStatus;
import com.travelagency.contractmanager.domain.enums.Region;
import com.travelagency.contractmanager.domain.model.Contract;
import com.travelagency.contractmanager.domain.model.Hotel;
import com.travelagency.contractmanager.repository.ContractRepository;
import com.travelagency.contractmanager.repository.HotelRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Initializes clearly identifiable demo data for testing.
 * Does not run if data already exists.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final HotelRepository hotelRepository;
    private final ContractRepository contractRepository;

    public DataInitializer(HotelRepository hotelRepository, ContractRepository contractRepository) {
        this.hotelRepository = hotelRepository;
        this.contractRepository = contractRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (hotelRepository.count() > 0) {
            log.info("Database already seeded with {} hotels. Skipping demo initialization.", hotelRepository.count());
            return;
        }

        log.info("Seeding clearly identifiable demo test data...");

        // Hotel 1: Hammamet (Iberostar Averroes Hammamet)
        Hotel hotelHammamet = new Hotel("Iberostar Averroes Hammamet", Region.HAMMAMET, Chain.IBEROSTAR);
        hotelHammamet = hotelRepository.save(hotelHammamet);

        Contract contract1 = new Contract(
                hotelHammamet,
                LocalDate.of(2026, 1, 15),
                LocalDate.of(2026, 1, 18),
                EntryStatus.SAISI,
                "30 jours fin de mois par virement bancaire"
        );
        contract1.setFileName("contrat_demo_iberostar_hammamet_2026.pdf");
        contract1.setFilePath("/uploads/contracts/demo_hammamet_01.pdf");
        contract1.setFileType("application/pdf");
        contract1.setFileSize(1425000L);

        Contract contract2 = new Contract(
                hotelHammamet,
                LocalDate.of(2026, 2, 1),
                LocalDate.of(2026, 2, 3),
                EntryStatus.XML,
                "Paiement direct à la réservation via passerelle de flux XML"
        );
        contract2.setFileName("flux_xml_demo_iberostar_2026.xml");
        contract2.setFilePath("/uploads/contracts/demo_hammamet_02.xml");
        contract2.setFileType("application/xml");
        contract2.setFileSize(320000L);

        // Hotel 2: Sousse (Marhaba Beach Resort Sousse)
        Hotel hotelSousse = new Hotel("Marhaba Beach Resort Sousse", Region.SOUSSE, Chain.MARHABA);
        hotelSousse = hotelRepository.save(hotelSousse);

        Contract contract3 = new Contract(
                hotelSousse,
                LocalDate.of(2026, 3, 10),
                LocalDate.of(2026, 3, 12),
                EntryStatus.NON_SAISI,
                "Acompte 20% à la confirmation de l'allotement, solde 15 jours avant arrivée"
        );
        contract3.setFileName("contrat_demo_marhaba_sousse_draft.pdf");
        contract3.setFilePath("/uploads/contracts/demo_sousse_01.pdf");
        contract3.setFileType("application/pdf");
        contract3.setFileSize(2150000L);

        // Hotel 3: Djerba (Hasdrubal Thalassa & Spa Djerba)
        Hotel hotelDjerba = new Hotel("Hasdrubal Thalassa & Spa Djerba", Region.DJERBA, Chain.HASDRUBAL);
        hotelDjerba = hotelRepository.save(hotelDjerba);

        Contract contract4 = new Contract(
                hotelDjerba,
                LocalDate.of(2026, 1, 20),
                LocalDate.of(2026, 1, 22),
                EntryStatus.SAISI,
                "Règlement bimensuel après réception des factures conformes"
        );
        contract4.setFileName("contrat_demo_hasdrubal_djerba_2026.pdf");
        contract4.setFilePath("/uploads/contracts/demo_djerba_01.pdf");
        contract4.setFileType("application/pdf");
        contract4.setFileSize(1850000L);

        Contract contract5 = new Contract(
                hotelDjerba,
                LocalDate.of(2026, 4, 5),
                LocalDate.of(2026, 4, 7),
                EntryStatus.NON_SAISI,
                "En attente de validation des conditions spéciales par la direction financière"
        );

        contractRepository.saveAll(List.of(contract1, contract2, contract3, contract4, contract5));

        log.info("Demo data initialized successfully: 3 hotels, 5 contracts (SAISI: 2, XML: 1, NON_SAISI: 2).");
    }
}
