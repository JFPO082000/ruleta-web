# 🚀 Guía Rápida de Despliegue en Render

## ✅ Archivos Listos

Todos los archivos necesarios están creados:
- ✅ `app.py` (FastAPI)
- ✅ `database.py` (Conexión PostgreSQL)
- ✅ `models.py` (Modelos ORM)
- ✅ `auth.py` (Autenticación JWT)
- ✅ `requirements.txt` (Dependencias)
- ✅ `runtime.txt` (Python 3.11)
- ✅ `static/db-integration.js` (Frontend integrado)

## 📋 Pasos para Desplegar

### 1. Subir a GitHub

```bash
git add .
git commit -m "Integración PostgreSQL completa"
git push origin main
```

### 2. Crear Web Service en Render

1. Ve a [render.com](https://render.com) → **New** → **Web Service**
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Name:** `ruleta-web` (o el nombre que prefieras)
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`

### 3. Agregar PostgreSQL

1. En tu Web Service → **Environment** tab
2. Scroll down → **Add Database**
3. Selecciona **PostgreSQL**
4. Render creará automáticamente la variable `DATABASE_URL`

### 4. Configurar Variables de Entorno (Opcional)

En **Environment** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `JWT_SECRET` | `tu-clave-super-secreta-aqui-12345` |

*Nota: Si no configuras JWT_SECRET, usará un valor por defecto.*

### 5. Crear Tablas en la Base de Datos

1. En Render → PostgreSQL → **Connect** → Copia la External Database URL
2. Usa un cliente PostgreSQL (DBeaver, pgAdmin, o psql) para conectarte
3. Ejecuta este SQL:

```sql
-- Tabla de roles
CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(30) UNIQUE NOT NULL,
    descripcion TEXT
);

-- Tabla de usuarios
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INTEGER REFERENCES rol(id_rol) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    curp VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de saldos
CREATE TABLE saldo (
    id_saldo SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE REFERENCES usuario(id_usuario) NOT NULL,
    saldo_actual NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles por defecto
INSERT INTO rol (nombre, descripcion) VALUES 
('jugador', 'Usuario regular del casino'),
('admin', 'Administrador del sistema');
```

### 6. Crear Usuario de Prueba (Opcional)

```sql
-- Primero, genera el hash del password
-- Usa este código Python localmente:

from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
print(pwd_context.hash("mipassword123"))

-- Luego inserta el usuario:
INSERT INTO usuario (id_rol, nombre, apellido, curp, email, password_hash, activo)
VALUES (
    1,
    'Test',
    'Usuario',
    'TEST000101HDFRNN01',
    'test@example.com',
    '$argon2id$...el-hash-generado-aqui...',
    true
);

-- Crear su saldo inicial
INSERT INTO saldo (id_usuario, saldo_actual) 
SELECT id_usuario, 500.00 
FROM usuario 
WHERE email = 'test@example.com';
```

### 7. Verificar Despliegue

1. Render desplegará automáticamente
2. Espera a que termine (verás "Build successful" y "Deploy live")
3. Abre tu URL: `https://tu-app.onrender.com`
4. Verifica en los logs:
   ```
   🚀 Iniciando aplicación...
   ✅ Conexión exitosa a PostgreSQL
   ```

### 8. Probar Auto-Login

Abre en tu navegador:
```
https://tu-app.onrender.com/?user_email=test@example.com
```

Deberías ver:
- El juego de ruleta cargado
- Tu saldo real desde la base de datos
- En los logs de Render: "🔌 Conexión desde App Inventor para: test@example.com"

## 🔌 Integrar con App Inventor

En tu aplicación de App Inventor:

```blocks
when ButtonJugar.Click do
  // Asumiendo que ya validaste el login
  set WebViewer1.Url to join "https://tu-app.onrender.com/?user_email=" get global_usuario_email
```

## ✅ Checklist Final

- [ ] Código subido a GitHub
- [ ] Web Service creado en Render
- [ ] PostgreSQL agregado
- [ ] Tablas creadas en BD
- [ ] Usuario de prueba creado con saldo
- [ ] Deployment exitoso (sin errores en logs)
- [ ] Auto-login funciona con `?user_email=`
- [ ] Saldo se carga desde BD
- [ ] Spin actualiza saldo en BD

## 🆘 Problemas Comunes

### Error: "DATABASE_URL no está configurada"
**Solución:** Agrega PostgreSQL en Render → Environment → Add Database

### Error: "relation 'usuario' does not exist"
**Solución:** Ejecuta el SQL para crear las tablas en tu base de datos

### El saldo no se carga
**Solución:** 
1. Verifica que el usuario tenga un registro en la tabla `saldo`
2. Abre la consola del navegador (F12) y busca errores
3. Revisa los logs de Render

### Error 401 "No autenticado"
**Solución:**
1. Abre la URL con `?user_email=` incluido
2. Verifica que el email exista en la tabla `usuario`
3. Verifica que `activo = true` para ese usuario

---

## 📞 ¿Necesitas Ayuda?

Revisa:
1. **README.md** - Documentación completa
2. **Logs de Render** - Para errores del servidor
3. **Consola del navegador (F12)** - Para errores del frontend

---

**¡Listo para desplegar! 🚀**
