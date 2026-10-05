import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';

export interface RmCarnetVerificationDto {
  carnetVerified?: boolean;
  carnetVerifiedAt?: string;
  carnetVerifiedBy?: string;
}

export interface RmCarnetVerificationOpState {
  isSync: boolean;
  lastError: string | null;
}

export interface RmCarnetVerificationWritePorts<
  TEntity,
  TOp extends RmCarnetVerificationOpState,
  TDto extends RmCarnetVerificationDto
> {
  coordinator: OnlineFirstWriteCoordinator;
  entityLabel: (entityId: number) => string;
  bulkLabel: (count: number) => string;
  entityId: (entity: TEntity) => number;
  buildOp: (entity: TEntity, verified: boolean) => TOp;
  setVerifiedApi: (entityId: number, verified: boolean) => Promise<TDto>;
  bulkSetApi: (entityIds: number[], verified: boolean) => Promise<unknown>;
  upsert: (op: TOp) => Promise<void>;
  applyPackMutation: (
    entityId: number,
    verified: boolean,
    at?: string,
    by?: string
  ) => Promise<void>;
}

export async function executeCarnetSetVerified<
  TEntity,
  TOp extends RmCarnetVerificationOpState,
  TDto extends RmCarnetVerificationDto
>(
  ports: RmCarnetVerificationWritePorts<TEntity, TOp, TDto>,
  entity: TEntity,
  verified: boolean
): Promise<TOp> {
  const op = ports.buildOp(entity, verified);
  const id = ports.entityId(entity);
  const result = await ports.coordinator.executeWrite({
    entityLabel: ports.entityLabel(id),
    saveOnline: async () => {
      const dto = await ports.setVerifiedApi(id, verified);
      const synced: TOp = { ...op, isSync: true, lastError: null };
      await ports.upsert(synced);
      await ports.applyPackMutation(
        id,
        dto.carnetVerified === true,
        dto.carnetVerifiedAt,
        dto.carnetVerifiedBy
      );
      return synced;
    },
    saveOffline: async () => {
      const pending: TOp = { ...op, isSync: false };
      await ports.upsert(pending);
      await ports.applyPackMutation(id, verified, new Date().toISOString(), 'offline');
      return pending;
    }
  });
  return result.data;
}

export async function executeCarnetBulkSet<
  TEntity,
  TOp extends RmCarnetVerificationOpState,
  TDto extends RmCarnetVerificationDto
>(
  ports: RmCarnetVerificationWritePorts<TEntity, TOp, TDto>,
  entities: TEntity[],
  verified: boolean
): Promise<void> {
  const ids = entities.map(e => ports.entityId(e));
  const result = await ports.coordinator.executeWrite({
    entityLabel: ports.bulkLabel(ids.length),
    saveOnline: async () => {
      await ports.bulkSetApi(ids, verified);
      for (const entity of entities) {
        await ports.applyPackMutation(
          ports.entityId(entity),
          verified,
          new Date().toISOString(),
          'bulk'
        );
      }
      return true;
    },
    saveOffline: async () => {
      for (const entity of entities) {
        await ports.upsert(ports.buildOp(entity, verified));
        await ports.applyPackMutation(
          ports.entityId(entity),
          verified,
          new Date().toISOString(),
          'offline'
        );
      }
      return true;
    }
  });
  void result;
}
