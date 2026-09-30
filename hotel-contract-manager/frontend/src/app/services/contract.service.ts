import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contract, ContractRequest, ContractFilters } from '../models/contract.model';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private readonly apiUrl = '/api/contracts';

  constructor(private http: HttpClient) {}

  /**
   * Récupère la liste des contrats avec filtres optionnels
   */
  getContracts(filters?: ContractFilters): Observable<Contract[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.region) params = params.set('region', filters.region);
      if (filters.chain) params = params.set('chain', filters.chain);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.hotel) params = params.set('hotel', filters.hotel);
      if (filters.receptionDateFrom) params = params.set('receptionDateFrom', filters.receptionDateFrom);
      if (filters.receptionDateTo) params = params.set('receptionDateTo', filters.receptionDateTo);
    }

    return this.http.get<Contract[]>(this.apiUrl, { params });
  }

  /**
   * Récupère un contrat par son identifiant
   */
  getContractById(id: number): Observable<Contract> {
    return this.http.get<Contract>(`${this.apiUrl}/${id}`);
  }

  /**
   * Enregistre un nouveau contrat (Phase 4)
   */
  createContract(request: ContractRequest): Observable<Contract> {
    return this.http.post<Contract>(this.apiUrl, request);
  }

  /**
   * Met à jour un contrat existant
   */
  updateContract(id: number, request: Partial<ContractRequest>): Observable<Contract> {
    return this.http.put<Contract>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Supprime un contrat
   */
  deleteContract(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
