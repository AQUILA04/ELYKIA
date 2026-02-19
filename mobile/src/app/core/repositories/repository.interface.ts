import { DateFilter } from '../models/date-filter.model';

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
}

export interface Repository<T, ID> {
    save(entity: T): Promise<void>;
    saveAll(entities: T[]): Promise<void>;
    findById(id: ID): Promise<T | null>;
    findAll(): Promise<T[]>;
    findAllPaginated(page: number, size: number): Promise<Page<T>>;
    delete(id: ID): Promise<void>;
}

export interface RepositoryViewFilters {
    searchQuery?: string;
    quarter?: string;
    dateFilter?: DateFilter;
    isLocal?: boolean;
    isSync?: boolean;
}
