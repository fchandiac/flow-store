import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuditActionType } from "../../../data/entities/audit.types";
import moment from "moment-timezone";
import bcrypt from "bcryptjs";

const APP_TIMEZONE = 'America/Santiago';

// Lazy import functions to avoid circular dependencies
const getDbModule = async () => (await import("../../../data/db")).getDb;
const getUserEntity = async () => (await import("../../../data/entities/User")).User;
const getAuditEntity = async () => (await import("../../../data/entities/Audit")).Audit;
const getPermissionEntity = async () => (await import("../../../data/entities/Permission")).Permission;

/**
 * Helper function to log login/logout attempts to audit
 * Uses Chile timezone (America/Santiago) for consistent timestamp handling
 */
export async function logLoginAudit(
  userName: string,
  action: AuditActionType.LOGIN_SUCCESS | AuditActionType.LOGIN_FAILED | AuditActionType.LOGOUT,
  userId?: string,
  details?: string
): Promise<void> {
  try {
    const getDb = await getDbModule();
    const Audit = await getAuditEntity();
    const db = await getDb();
    // Create timestamp in Chile timezone using moment
    const chileNow = moment.tz(APP_TIMEZONE);
    // Create Date from formatted string without timezone info - this preserves the local time
    const now = new Date(chileNow.format('YYYY-MM-DD HH:mm:ss'));
    
    const audit = new Audit();
    audit.entityName = 'Auth'; // Entidad especial para login
    audit.entityId = userName; // Usar userName como identificador
    audit.userId = userId; // ID del usuario logueado (si existe)
    audit.action = action as any; // Convertir enum a string
    audit.description = `${action} para usuario: ${userName}${details ? ` - ${details}` : ''}`;
    audit.oldValues = undefined;
    audit.newValues = {
      userName,
      action,
      timestamp: chileNow.format('DD-MM-YYYY HH:mm'),
    };
    audit.changes = {
      fields: {},
      changedFields: [],
    };
    audit.createdAt = now; // Assign explicit timestamp in Chile timezone

    await db.getRepository(Audit).save(audit);
    console.log('[logLoginAudit] Auditoría registrada exitosamente:', action, 'para usuario:', userName, 'en:', chileNow.format('DD-MM-YYYY HH:mm'));
  } catch (error) {
    console.error('[logLoginAudit] Error logging audit:', error instanceof Error ? error.message : String(error));
    // No lanzar error para no interrumpir el proceso de login
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("Authorize called with credentials:", {
          username: credentials?.username,
          password: credentials?.password ? 'SET' : 'UNDEFINED',
          allKeys: Object.keys(credentials || {}),
        });
        
        if (!credentials?.username || !credentials?.password) {
          console.log("Missing credentials:", {
            hasUsername: !!credentials?.username,
            hasPassword: !!credentials?.password,
          });
          // Log failed login attempt - no user found
          await logLoginAudit(credentials?.username || 'unknown', AuditActionType.LOGIN_FAILED, undefined, 'Credenciales incompletas');
          throw new Error("Credenciales incompletas");
        }

        try {
          console.log("Connecting to DB...");
          const getDb = await getDbModule();
          const User = await getUserEntity();
          const Permission = await getPermissionEntity();
          const db = await getDb();
          console.log("DB Connected. Searching user:", credentials.username);
          
          const userRepo = db.getRepository(User);
          const count = await userRepo.count();
          console.log(`Total users in DB: ${count}`);

          const user = await userRepo.findOne({ 
            where: { userName: credentials.username },
            relations: ['person']
          });

          if (!user) {
            console.log("User not found");
            // Log failed login attempt - user not found
            await logLoginAudit(credentials.username, AuditActionType.LOGIN_FAILED, undefined, 'Usuario no encontrado');
            throw new Error("Usuario o contraseña incorrectos");
          }

          console.log("User found. Verifying password...");
          console.log("User pass hash:", user.pass);
          console.log("Password provided:", credentials.password);
          const isValid = await bcrypt.compare(credentials.password, user.pass);
          console.log("Password comparison result:", isValid);

          if (!isValid) {
            console.log("Invalid password");
            // Log failed login attempt - invalid password
            await logLoginAudit(credentials.username, AuditActionType.LOGIN_FAILED, user.id, 'Contraseña incorrecta');
            throw new Error("Usuario o contraseña incorrectos");
          }

          console.log("Fetching permissions for user", user.id);
          const permissionRepo = db.getRepository(Permission);
          const userPermissions = await permissionRepo.find({
            select: ['ability'],
            where: { userId: user.id },
          });

          const abilities = userPermissions.map((permission) => permission.ability);

          console.log("Login successful");
          // Log successful login
          await logLoginAudit(credentials.username, AuditActionType.LOGIN_SUCCESS, user.id);
          
          return {
            id: user.id,
            name: user.person?.firstName ? `${user.person.firstName} ${user.person.lastName || ''}`.trim() : '',
            email: user.mail,
            role: user.rol,
            permissions: abilities,
          };
        } catch (error: any) {
          console.error("Auth error:", error);
          
          // Detectar errores de conexión a la base de datos
          const errorMessage = error?.message || String(error);
          if (error?.code === 'ECONNREFUSED' || 
              error?.code === 'ETIMEDOUT' || 
              error?.code === 'ENOTFOUND' ||
              error?.errno === 'ECONNREFUSED' ||
              error?.errno === 'ETIMEDOUT' ||
              errorMessage.includes('ECONNREFUSED') ||
              errorMessage.includes('ETIMEDOUT') ||
              errorMessage.includes('getaddrinfo') ||
              errorMessage.includes('connect')) {
            throw new Error("database_connection_error");
          }
          
          // Si ya es un error con mensaje personalizado, re-lanzarlo
          if (error?.message) {
            throw error;
          }
          
          // Para cualquier otro error desconocido
          throw new Error("Error al procesar la autenticación");
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: false, // false for Electron to allow client-side access
        sameSite: 'lax',
        path: '/',
        secure: false, // false for Electron/localhost
        maxAge: 30 * 24 * 60 * 60, // 30 days - persistent cookie
      },
    },
  },
  // For Electron: disable secure cookies to allow localStorage fallback
  useSecureCookies: false,
  pages: {
    signIn: "/", // Custom sign in page (we'll use the home page)
  },
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-key-for-development-at-least-32-chars-long',
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Si la URL incluye callbackUrl, usarla
      if (url.includes('/admin') || url.includes('/pointOfSale') || url.includes('callbackUrl')) {
        return url;
      }
      // Por defecto, redirigir a /admin después del login (para usuarios admin)
      return `${baseUrl}/admin`;
    },
    async session({ session, token }) {
      // Debug: inspect session & token when session callback runs
      try {
        console.debug('[authOptions.session] session callback invoked. token.sub=', token?.sub, ' token.userId=', token?.userId);
        // log a small subset to avoid dumping secrets
        console.debug('[authOptions.session] token keys:', Object.keys(token || {}));
      } catch (err) {
        console.debug('[authOptions.session] debug log error:', err);
      }
      if (session.user) {
        (session.user as any).id = token.userId || token.sub;
        (session.user as any).name = token.name;
        (session.user as any).email = token.email;
        if (token.role) {
          (session.user as any).role = token.role;
        }
        if (Array.isArray(token.permissions)) {
          (session.user as any).permissions = token.permissions;
        } else {
          (session.user as any).permissions = [];
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      // Debug: inspect token / user when jwt callback runs
      try {
        if (user) {
          console.debug('[authOptions.jwt] jwt callback invoked after login. user.id=', (user as any).id, ' user.email=', (user as any).email);
        } else {
          console.debug('[authOptions.jwt] jwt callback invoked (no user). token.sub=', token?.sub);
        }
        console.debug('[authOptions.jwt] token keys before processing:', Object.keys(token || {}));
      } catch (err) {
        console.debug('[authOptions.jwt] debug log error:', err);
      }
      if (user) {
        token.userId = user.id;
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role ?? (user as any).rol ?? token.role;
        token.permissions = Array.isArray((user as any).permissions) ? (user as any).permissions : token.permissions;
      }

      if (token.sub) {
        try {
          const getDb = await getDbModule();
          const User = await getUserEntity();
          const Permission = await getPermissionEntity();
          const db = await getDb();
          const userRepo = db.getRepository(User);
          const dbUser = await userRepo.findOne({ where: { id: token.sub } });
          if (dbUser?.rol) {
            token.role = dbUser.rol;
          }

          // Siempre cargar permisos desde la BD para mantenerlos actualizados
          const permissionRepo = db.getRepository(Permission);
          const dbPermissions = await permissionRepo.find({
            select: ['ability'],
            where: { userId: token.sub },
          });
          token.permissions = dbPermissions.map((permission) => permission.ability);
        } catch (error) {
          console.error('[authOptions.jwt] Error fetching user role from DB:', error);
        }
      }

      if (!Array.isArray(token.permissions)) {
        token.permissions = [];
      }

      // Debug: final token keys returned by jwt callback
      try {
        console.debug('[authOptions.jwt] token keys after processing:', Object.keys(token || {}));
      } catch (err) {
        console.debug('[authOptions.jwt] debug log error (post):', err);
      }
      return token;
    },
  },
  events: {
    async signOut({ token, session }) {
      // Registrar auditoría de logout
      console.log('[signOut event] Token:', token);
      if (token?.userId) {
        try {
          const getDb = await getDbModule();
          const User = await getUserEntity();
          const db = await getDb();
          const userRepo = db.getRepository(User);
          const user = await userRepo.findOneBy({ id: token.userId as string });
          if (user) {
            await logLoginAudit(user.userName, AuditActionType.LOGOUT, user.id);
            console.log('[signOut event] Logout audit logged for user:', user.userName);
          }
        } catch (error) {
          console.error('[signOut event] Error logging logout audit:', error);
        }
      }
    },
  },
};
