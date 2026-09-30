import { Component, OnInit } from '@angular/core';
import { ContractService } from '../../services/contract.service';
import { Contract, ContractFilters, EntryStatus } from '../../models/contract.model';

@Component({
  selector: 'app-contract-list',
  template: `
    <div class="contracts-page">
      <div class="header">
        <h1>Registre des Contrats Hôteliers</h1>
        <button class="btn-primary" (click)="openAddModal()">+ Ajouter un contrat</button>
      </div>

      <!-- Filtres -->
      <div class="filters-bar">
        <input type="text" [(ngModel)]="filters.hotel" (input)="applyFilters()" placeholder="Recherche hôtel..." />
        <select [(ngModel)]="filters.region" (change)="applyFilters()">
          <option value="">Toutes les régions</option>
          <option *ngFor="let r of regions" [value]="r">{{ r }}</option>
        </select>
        <select [(ngModel)]="filters.chain" (change)="applyFilters()">
          <option value="">Toutes les chaînes</option>
          <option *ngFor="let c of chains" [value]="c">{{ c }}</option>
        </select>
        <select [(ngModel)]="filters.status" (change)="applyFilters()">
          <option value="">Tous les statuts</option>
          <option value="NON_SAISI">Non Saisi</option>
          <option value="SAISI">Saisi</option>
          <option value="XML">XML</option>
        </select>
        <input type="date" [(ngModel)]="filters.receptionDateFrom" (change)="applyFilters()" />
      </div>

      <!-- Table des contrats -->
      <table class="contracts-table">
        <thead>
          <tr>
            <th>Hôtel</th>
            <th>Région</th>
            <th>Chaîne</th>
            <th>Date contrat</th>
            <th>Date réception</th>
            <th>Saisie</th>
            <th>Paiement</th>
            <th>Contrat</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let contract of contracts">
            <td><strong>{{ contract.hotel.name }}</strong></td>
            <td>{{ contract.hotel.region }}</td>
            <td>{{ contract.hotel.chain }}</td>
            <td>{{ contract.contractDate }}</td>
            <td>{{ contract.receptionDate }}</td>
            <td>
              <span *ngIf="contract.entryStatus === 'SAISI'" class="badge badge-green">✓ Saisi</span>
              <span *ngIf="contract.entryStatus === 'XML'" class="badge badge-blue">XML</span>
              <span *ngIf="contract.entryStatus === 'NON_SAISI'" class="badge badge-red">Non Saisi</span>
            </td>
            <td>{{ contract.paymentTerms || '-' }}</td>
            <td>{{ contract.fileName || 'Sans fichier' }}</td>
            <td>
              <button (click)="openEditModal(contract)">Modifier</button>
              <button (click)="deleteContract(contract.id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class ContractListComponent implements OnInit {
  contracts: Contract[] = [];
  filters: ContractFilters = {};
  regions = ['HAMMAMET', 'MAHDIA', 'SOUSSE', 'MONASTIR', 'DJERBA', 'SFAX', 'TUNIS', 'TABARKA', 'DOUZ', 'TOZEUR', 'BIZERTE', 'KAIROUAN', 'DIVERS'];
  chains = ['IBEROSTAR', 'EL_MOURADI', 'BHR', 'KHAYAM', 'MARHABA', 'AZUR', 'VINCCI', 'TMK', 'HASDRUBAL', 'TTS', 'MEDINA', 'MAGIC_LIFE', 'THALASSA', 'MZABI', 'CONCORDE', 'SHT', 'INDEPENDANT'];

  constructor(private contractService: ContractService) {}

  ngOnInit(): void {
    this.loadContracts();
  }

  loadContracts(): void {
    this.contractService.getContracts(this.filters).subscribe({
      next: (data) => this.contracts = data,
      error: (err) => console.error('Erreur chargement contrats', err)
    });
  }

  applyFilters(): void {
    this.loadContracts();
  }

  openAddModal(): void {
    // Open add contract modal
  }

  openEditModal(contract: Contract): void {
    // Open edit modal
  }

  deleteContract(id: number): void {
    if (confirm('Confirmer la suppression ?')) {
      this.contractService.deleteContract(id).subscribe({
        next: () => this.loadContracts(),
        error: (err) => alert('Erreur suppression: ' + err.message)
      });
    }
  }
}
