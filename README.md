# Ruleta Web con PostgreSQL

Aplicación de ruleta europea integrada con PostgreSQL para gestión de usuarios y saldos.

## 🚀 Características

- **Backend FastAPI** con PostgreSQL
- **Autenticación JWT** con Argon2
- **Auto-login** para App Inventor vía cookies
- **Sincronización de saldo** en tiempo real
- **Ruleta europea** con orden oficial de números

## 📋 Requisitos para Render

### Variables de Entorno

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DATABASE_URL` | *(Automática)* | Render la crea al agregar PostgreSQL |
| `JWT_SECRET` | `tu-clave-secreta` | Opcional, genera automáticamente si no existe |

### Comandos de Despliegue

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

## 🔌 Integración con App Inventor

### Auto-Login desde WebViewer

```blocks
Call WebViewer.GoToUrl
  url: join "https://tu-app.onrender.com/?user_email=" get global usuario_email
```

**Cómo funciona:**
1. App Inventor abre el WebView con el parámetro `?user_email=`
2. El backend busca el usuario en PostgreSQL
3. Si existe, crea un token JWT automáticamente
4. Guarda el token en una cookie del navegador
5. El juego carga el saldo del usuario desde la base de datos

### Seguridad

⚠️ **Importante:** El auto-login NO valida password. Se asume que tu aplicación de App Inventor ya validó las credenciales del usuario antes de abrir el WebView.

## 🎮 Uso Manual (Sin App Inventor)

### Login con Email y Password

**Endpoint:** `POST /api/auth/login`

```json
{
  "email": "usuario@example.com",
  "password": "tu_password"
}
```

**Respuesta:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJ...",
  "user": {
    "id_usuario": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "usuario@example.com"
  }
}
```

Usa el token en el header: `Authorization: Bearer <token>`

## 🗄️ Base de Datos

### Tablas Requeridas

```sql
CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(30) UNIQUE NOT NULL,
    descripcion TEXT
);

CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INTEGER REFERENCES rol(id_rol),
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    curp VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE saldo (
    id_saldo SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE REFERENCES usuario(id_usuario),
    saldo_actual NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Nota:** El password debe estar hasheado con Argon2 (compatible con tu app de registro).

## 📁 Estructura del Proyecto

```
ruleta-web-1/
├── app.py                  # FastAPI principal
├── database.py             # Conexión PostgreSQL
├── models.py               # Modelos ORM (SQLAlchemy)
├── auth.py                 # Autenticación JWT + Argon2
├── requirements.txt        # Dependencias Python
├── runtime.txt             # Versión de Python
├── templates/
│   └── index.html          # Página principal
└── static/
    ├── app.js              # Lógica del juego
    ├── db-integration.js   # Integración con BD
    ├── style.css           # Estilos
    └── pattern-bg.jpg      # Fondo
```

## 🔧 Desarrollo Local

### Instalar Dependencias

```bash
pip install -r requirements.txt
```

### Configurar Base de Datos Local

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_bd"

# Linux/Mac
export DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_bd"
```

### Ejecutar Servidor

```bash
uvicorn app:app --reload --port 8000
```

Abre en el navegador: `http://localhost:8000`

## 📡 Endpoints de la API

### Autenticación

- `POST /api/auth/login` - Login manual con email/password

### Saldo

- `GET /api/saldo` - Obtener saldo actual (requiere autenticación)

### Juego

- `GET /` - Página principal (con auto-login opcional: `?user_email=...`)
- `POST /api/spin` - Girar ruleta (requiere autenticación)

  **Request:**
  ```json
  {
    "balance": 1000,
    "currentBet": 50,
    "bets": [
      {
        "amt": 50,
        "type": "inside_whole",
        "odds": 35,
        "numbers": "7"
      }
    ],
    "numbersBet": [7]
  }
  ```

  **Response:**
  ```json
  {
    "winningSpin": 7,
    "winValue": 1750,
    "newBalance": 2700
  }
  ```

## 🎲 Tipos de Apuestas Soportadas

- **Inside Whole** (número completo): 35:1
- **Split** (dos números): 17:1
- **Street** (tres números): 11:1
- **Corner** (cuatro números): 8:1
- **Double Street** (seis números): 5:1
- **Outside Column** (columna): 2:1
- **Outside Dozen** (docena): 2:1
- **Outside High/Low** (1-18 / 19-36): 1:1
- **Outside Red/Black/Even/Odd**: 1:1
- **Zero** (0): 35:1

## 🐛 Solución de Problemas

### Error "No autenticado"
- Verifica que la cookie se esté enviando (`credentials: 'include'` en fetch)
- Revisa que el usuario exista en la base de datos

### Saldo no se carga
- Verifica que `DATABASE_URL` esté configurada en Render
- Checa los logs de Render para ver errores de conexión
- Asegúrate de que el usuario tenga un registro en la tabla `saldo`

### Error de conexión PostgreSQL
- Verifica que el fix `postgres://` → `postgresql://` esté en `database.py`
- Confirma que la base de datos esté activa en Render

## 📚 Tecnologías Utilizadas

- **Backend:** FastAPI, SQLAlchemy, PostgreSQL
- **Autenticación:** JWT (python-jose), Argon2 (passlib)
- **Frontend:** Vanilla JavaScript, CSS3
- **Despliegue:** Render

## 📞 Soporte

Si tienes problemas, verifica:
1. Los logs de Render
2. La consola del navegador (F12)
3. Que las tablas de BD existan y tengan datos

---

**¡Buena suerte con tus apuestas! 🎰**
