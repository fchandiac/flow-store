import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

/**
 * DBHelper - Helper para operaciones de base de datos en tests E2E
 * 
 * Provee métodos para:
 * - Consultar usuarios y personas
 * - Consultar auditorías
 * - Limpiar datos de test
 * - Validaciones
 */

interface User {
  id: string;
  userName: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  personId: string;
  person?: {
    name?: string;
    dni?: string;
    phone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Audit {
  id: string;
  entityName: string;
  entityId: string;
  userId: string | null;
  action: string;
  oldValues?: any;
  newValues?: any;
  changes?: any;
  description?: string;
  createdAt?: Date;
  timestamp?: Date;
}

interface AuditStats {
  total: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byStatus: Record<string, number>;
}

export class DBHelper {
  private connection: mysql.Connection | null = null;
  private config: any;

  constructor() {
    // Leer configuración de test
    const configPath = path.join(process.cwd(), 'app.config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('app.config.json no encontrado');
    }
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  /**
   * Conectar a la base de datos de test
   */
  async connect(): Promise<void> {
    if (this.connection) return;

    this.connection = await mysql.createConnection({
      host: this.config.database.host,
      port: this.config.database.port,
      user: this.config.database.username,
      password: this.config.database.password,
      database: this.config.database.database,
    });
  }

  /**
   * Desconectar de la base de datos
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  /**
   * Buscar usuario por username
   */
  async findUserByUsername(userName: string): Promise<any> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      `SELECT u.*, p.name as personName, p.dni as personDni, p.phone as personPhone 
       FROM users u 
       LEFT JOIN persons p ON u.personId = p.id 
       WHERE u.userName = ? AND u.deletedAt IS NULL`,
      [userName]
    );
    const users = rows as any[];
    if (users.length > 0) {
      const user = users[0];
      // Estructurar el resultado para que coincida con la entidad
      return {
        ...user,
        person: user.personId ? {
          name: user.personName,
          dni: user.personDni,
          phone: user.personPhone
        } : null
      };
    }
    return null;
  }

  /**
   * Buscar usuario por email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT * FROM users WHERE mail = ? AND deletedAt IS NULL',
      [email]
    );
    const users = rows as User[];
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Contar usuarios activos (no borrados)
   */
  async countActiveUsers(): Promise<number> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT COUNT(*) as count FROM user WHERE isDeleted = 0'
    );
    const result = rows as any[];
    return result[0].count;
  }

  /**
   * Buscar auditorías por usuario
   */
  async findAuditsByUser(userId: string): Promise<Audit[]> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT * FROM audits WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );
    return rows as Audit[];
  }

  /**
   * Buscar la última auditoría por acción
   */
  async findLatestAuditByAction(action: string): Promise<Audit | null> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT * FROM audits WHERE action = ? ORDER BY timestamp DESC LIMIT 1',
      [action]
    );
    const audits = rows as Audit[];
    return audits.length > 0 ? audits[0] : null;
  }

  /**
   * Buscar auditorías por tipo de entidad
   */
  async findAuditsByEntityType(entityType: string): Promise<Audit[]> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT * FROM audits WHERE entityType = ? ORDER BY timestamp DESC',
      [entityType]
    );
    return rows as Audit[];
  }

  /**
   * Limpiar todas las auditorías
   */
  async clearAudits(): Promise<void> {
    await this.connect();
    await this.connection!.execute('DELETE FROM audits');
  }

  /**
   * Buscar registros de auditoría por entidad y acción
   */
  async findAuditRecords(entityName: string, action: string): Promise<Audit[]> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT * FROM audits WHERE entityName = ? AND action = ? ORDER BY createdAt DESC',
      [entityName, action]
    );
    return rows as Audit[];
  }

  /**
   * Eliminar usuario por username (para cleanup de tests)
   */
  async deleteUserByUsername(userName: string): Promise<void> {
    await this.connect();
    const user = await this.findUserByUsername(userName);
    if (!user) return;

    // Eliminar auditorías del usuario
    await this.connection!.execute('DELETE FROM audits WHERE userId = ?', [user.id]);
    
    // Eliminar usuario
    await this.connection!.execute('DELETE FROM user WHERE id = ?', [user.id]);
    
    // Eliminar persona asociada
    if (user.personId) {
      await this.connection!.execute('DELETE FROM person WHERE id = ?', [user.personId]);
    }
  }

  /**
   * Verificar si existe un email
   */
  async emailExists(email: string): Promise<boolean> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT COUNT(*) as count FROM user WHERE email = ? AND isDeleted = 0',
      [email]
    );
    const result = rows as any[];
    return result[0].count > 0;
  }

  /**
   * Verificar si existe un username
   */
  async usernameExists(userName: string): Promise<boolean> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT COUNT(*) as count FROM user WHERE userName = ? AND isDeleted = 0',
      [userName]
    );
    const result = rows as any[];
    return result[0].count > 0;
  }

  /**
   * Obtener estadísticas de auditorías
   */
  async getAuditStats(): Promise<AuditStats> {
    await this.connect();

    // Total
    const [totalRows] = await this.connection!.execute('SELECT COUNT(*) as count FROM audits');
    const total = (totalRows as any[])[0].count;

    // Por acción
    const [actionRows] = await this.connection!.execute(
      'SELECT action, COUNT(*) as count FROM audits GROUP BY action'
    );
    const byAction = (actionRows as any[]).reduce((acc, row) => {
      acc[row.action] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // Por tipo de entidad (entityName)
    const [entityRows] = await this.connection!.execute(
      'SELECT entityName, COUNT(*) as count FROM audits GROUP BY entityName'
    );
    const byEntityType = (entityRows as any[]).reduce((acc, row) => {
      acc[row.entityName] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // Por status (no existe en la tabla, retornar vacío)
    const byStatus: Record<string, number> = {
      'SUCCESS': total,
    };

    return {
      total,
      byAction,
      byEntityType,
      byStatus,
    };
  }

  /**
   * Buscar persona por ID
   */
  async findPersonById(personId: string): Promise<Person | null> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT * FROM person WHERE id = ? AND isDeleted = 0',
      [personId]
    );
    const persons = rows as Person[];
    return persons.length > 0 ? persons[0] : null;
  }

  /**
   * Limpiar todos los usuarios de test (mantener solo usuarios base)
   */
  async clearTestUsers(): Promise<void> {
    await this.connect();
    
    // Eliminar usuarios de test (los que empiezan con test_)
    await this.connection!.execute(`
      DELETE FROM user WHERE userName LIKE 'test_%' OR userName LIKE 'temp_%'
    `);
    
    // Eliminar personas huérfanas (sin usuario asociado)
    await this.connection!.execute(`
      DELETE FROM person WHERE id NOT IN (SELECT personId FROM user WHERE personId IS NOT NULL)
    `);
  }

  /**
   * Ejecutar query custom (para casos especiales)
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.connect();
    const [rows] = await this.connection!.execute(sql, params);
    return rows as T[];
  }

  // ===== MÉTODOS PARA FORMATOS =====

  /**
   * Buscar formato por nombre
   */
  async findFormatByName(name: string): Promise<any> {
    await this.connect();
    const [rows] = await this.connection!.execute(
      'SELECT * FROM formats WHERE name = ? AND deletedAt IS NULL',
      [name]
    );
    return (rows as any[])[0] || null;
  }

  /**
   * Crear formato de prueba
   */
  async createTestFormat(name: string, description: string): Promise<number> {
    await this.connect();
    const [result] = await this.connection!.execute(
      'INSERT INTO formats (name, description, active, createdAt, updatedAt) VALUES (?, ?, true, NOW(), NOW())',
      [name, description]
    );
    return (result as any).insertId;
  }

  /**
   * Actualizar formato de prueba
   */
  async updateTestFormat(name: string, newDescription: string): Promise<void> {
    await this.connect();
    await this.connection!.execute(
      'UPDATE formats SET description = ?, updatedAt = NOW() WHERE name = ? AND deletedAt IS NULL',
      [newDescription, name]
    );
  }

  /**
   * Eliminar formato de prueba
   */
  async deleteTestFormat(id: number): Promise<void> {
    await this.connect();
    await this.connection!.execute(
      'UPDATE formats SET deletedAt = NOW(), updatedAt = NOW() WHERE id = ?',
      [id]
    );
  }

  /**
   * Limpiar formatos de prueba
   */
  async clearTestFormats(): Promise<void> {
    await this.connect();

    // Eliminar formatos de test (los que empiezan con TEST_ o test_)
    await this.connection!.execute(`
      DELETE FROM formats WHERE name LIKE 'TEST_%' OR name LIKE 'test_%' OR name LIKE 'temp_%' OR name LIKE 'DELETE_%' OR name LIKE 'AUDIT_%'
    `);
  }
}
