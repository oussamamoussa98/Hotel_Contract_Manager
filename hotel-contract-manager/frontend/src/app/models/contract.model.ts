import { Hotel, Region, Chain } from './hotel.model';

export type EntryStatus = 'SAISI' | 'XML' | 'NON_SAISI';

export interface Contract {
  id: number;
  hotel: Hotel;
  contractDate: string;
  receptionDate: string;
  entryStatus: EntryStatus;
  statusLabel?: string;
  statusBadgeColor?: string;
  paymentTerms?: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractRequest {
  hotelId?: number;
  hotel?: {
    name: string;
    region: Region;
    chain: Chain;
  };
  contractDate: string;
  receptionDate: string;
  entryStatus: EntryStatus;
  paymentTerms?: string;
  fileName?: string;
}

export interface ContractFilters {
  region?: string;
  chain?: string;
  status?: string;
  hotel?: string;
  receptionDateFrom?: string;
  receptionDateTo?: string;
}
