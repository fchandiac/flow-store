import { EventSubscriber, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';
import { User } from '../entities/User';
import { Person } from '../entities/Person';
import { AuditService } from '../services/AuditService';
import { AuditActionType } from '../entities/audit.types';

// Entidades a auditar (solo Person, User es auditado manualmente en las acciones)
const AUDITABLE_ENTITIES = ['Person'];

@EventSubscriber()
export class AuditSubscriber {
  private auditService: AuditService | null = null;

  private isAuditable(entity: any): boolean {
    const entityName = entity?.constructor?.name;
    return AUDITABLE_ENTITIES.includes(entityName);
  }

  private async getAuditService(dataSource: any): Promise<AuditService> {
    if (!this.auditService) {
      this.auditService = new AuditService(dataSource);
    }
    return this.auditService;
  }

  /**
   * Se ejecuta después de insertar
   */
  async afterInsert(event: InsertEvent<any>) {
    if (!this.isAuditable(event.entity)) return;

    try {
      const auditService = await this.getAuditService(event.manager.connection);
      const entityName = event.entity.constructor.name;

      await auditService.logAudit({
        entityName,
        entityId: event.entity.id,
        userId: undefined, // Sin userId en CREATE automático
        action: AuditActionType.CREATE,
        oldValues: undefined,
        newValues: this.sanitizeEntity(event.entity),
      });
    } catch (error) {
      console.error('[AuditSubscriber] Error en afterInsert:', error);
      // No lanzar error para no interrumpir la operación
    }
  }

  /**
   * Se ejecuta después de actualizar
   */
  async afterUpdate(event: UpdateEvent<any>) {
    if (!event.entity || !this.isAuditable(event.entity)) return;

    try {
      const auditService = await this.getAuditService(event.manager.connection);
      const entityName = event.entity.constructor.name;

      // Obtener valores anteriores desde el changelog
      const oldValues = event.databaseEntity ? this.sanitizeEntity(event.databaseEntity) : undefined;
      const newValues = event.entity ? this.sanitizeEntity(event.entity) : undefined;

      await auditService.logAudit({
        entityName,
        entityId: event.entity.id,
        userId: undefined,
        action: AuditActionType.UPDATE,
        oldValues,
        newValues,
      });
    } catch (error) {
      console.error('[AuditSubscriber] Error en afterUpdate:', error);
    }
  }

  /**
   * Se ejecuta después de eliminar
   */
  async afterRemove(event: RemoveEvent<any>) {
    if (!this.isAuditable(event.entity)) return;

    try {
      const auditService = await this.getAuditService(event.manager.connection);
      const entityName = event.entity.constructor.name;

      await auditService.logAudit({
        entityName,
        entityId: event.entity.id,
        userId: undefined,
        action: AuditActionType.DELETE,
        oldValues: this.sanitizeEntity(event.entity),
        newValues: undefined,
      });
    } catch (error) {
      console.error('[AuditSubscriber] Error en afterRemove:', error);
    }
  }

  /**
   * Limpia la entidad para auditoría (elimina relaciones complejas)
   */
  private sanitizeEntity(entity: any): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(entity)) {
      // Ignorar campos que empiezan con _
      if (typeof key === 'string' && key.startsWith('_')) continue;

      // Ignorar objetos complejos que no sean Date
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        // Ignorar relaciones completas
        if (key === 'person' || key === 'user') continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }
}
