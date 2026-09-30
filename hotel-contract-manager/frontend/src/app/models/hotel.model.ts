export type Region =
  | 'HAMMAMET'
  | 'MAHDIA'
  | 'SOUSSE'
  | 'MONASTIR'
  | 'DJERBA'
  | 'SFAX'
  | 'TUNIS'
  | 'TABARKA'
  | 'DOUZ'
  | 'TOZEUR'
  | 'BIZERTE'
  | 'KAIROUAN'
  | 'DIVERS';

export type Chain =
  | 'IBEROSTAR'
  | 'EL_MOURADI'
  | 'BHR'
  | 'KHAYAM'
  | 'MARHABA'
  | 'AZUR'
  | 'VINCCI'
  | 'TMK'
  | 'HASDRUBAL'
  | 'TTS'
  | 'MEDINA'
  | 'MAGIC_LIFE'
  | 'THALASSA'
  | 'MZABI'
  | 'CONCORDE'
  | 'SHT'
  | 'INDEPENDANT';

export interface Hotel {
  id: number;
  name: string;
  region: Region;
  regionDisplayName?: string;
  chain: Chain;
  chainDisplayName?: string;
  createdAt?: string;
  updatedAt?: string;
  contractCount?: number;
}
