# ✅ CHECKLIST DE DEPLOYMENT - RULETA WEB

## 📋 PREPARACIÓN (Local)

### 1. Verificar Archivos
- [ ] `app.py` existe y tiene 7774 bytes
- [ ] `database.py` existe y tiene 1573 bytes
- [ ] `models.py` existe y tiene 1524 bytes
- [ ] `auth.py` existe y tiene 2898 bytes
- [ ] `requirements.txt` existe y tiene 163 bytes
- [ ] `runtime.txt` existe y tiene 15 bytes
- [ ] `static/db-integration.js` existe
- [ ] `templates/index.html` actualizado con db-integration.js

### 2. Probar Localmente (Opcional)
- [ ] Instaladas dependencias: `pip install -r requirements.txt`
- [ ] Configurado DATABASE_URL local
- [ ] Ejecutado: `python test_local.py`
- [ ] Servidor funciona: `uvicorn app:app --reload`
- [ ] Página carga en http://localhost:8000

---

## 🔄 SUBIR A GITHUB

### 3. Git Setup
```bash
# Verificar cambios
git status

# Agregar todos los archivos
git add .

# Commit
git commit -m "Integración PostgreSQL completa - FastAPI + Auto-login"

# Push
git push origin main
```

- [ ] Código subido exitosamente a GitHub
- [ ] Visible en repositorio web

---

## 🚀 DEPLOYMENT EN RENDER

### 4. Crear Web Service
- [ ] Ir a https://dashboard.render.com
- [ ] Click en "New" → "Web Service"
- [ ] Conectar repositorio de GitHub
- [ ] Seleccionar project: `ruleta-web-1`

### 5. Configuración del Service
```
Name: ruleta-web
Region: Oregon (US West) o el más cercano
Branch: main
Runtime: Python 3

Build Command:
pip install -r requirements.txt

Start Command:
uvicorn app:app --host 0.0.0.0 --port $PORT
```

- [ ] Name configurado
- [ ] Build Command configurado
- [ ] Start Command configurado
- [ ] Click en "Create Web Service"

### 6. Agregar PostgreSQL
- [ ] En tu Web Service → Tab "Environment"
- [ ] Scroll down → "Add Database"
- [ ] Seleccionar "PostgreSQL"
- [ ] Confirm
- [ ] Esperar a que se cree (1-2 minutos)
- [ ] Verificar que `DATABASE_URL` aparezca en Environment Variables

### 7. Variables de Entorno (Opcional)
- [ ] En "Environment" → "Environment Variables"
- [ ] Add: `JWT_SECRET` = `tu-clave-super-secreta-12345`
- [ ] Save Changes

---

## 🗄️ CONFIGURAR BASE DE DATOS

### 8. Conectar a PostgreSQL
- [ ] En Render → PostgreSQL Database → Tab "Connect"
- [ ] Copiar "External Database URL"
- [ ] Abrir cliente PostgreSQL (DBeaver, pgAdmin, o psql)
- [ ] Pegar URL y conectar

### 9. Crear Tablas
- [ ] Abrir archivo `create_tables.sql`
- [ ] Copiar TODO el contenido
- [ ] Pegar en query editor de tu cliente PostgreSQL
- [ ] Ejecutar

**Verificar:**
```sql
SELECT * FROM rol;
SELECT * FROM usuario;
SELECT * FROM saldo;
```

- [ ] Tabla `rol` existe y tiene 2 roles (jugador, admin)
- [ ] Tabla `usuario` existe
- [ ] Tabla `saldo` existe

### 10. Crear Usuario de Prueba

**Generar password hash:**
- [ ] En local: `python test_password.py`
- [ ] Ingresar password: `test123` (o el que quieras)
- [ ] Copiar el hash generado

**Insertar usuario:**
```sql
INSERT INTO usuario (id_rol, nombre, apellido, curp, email, password_hash, activo)
VALUES (
    1,
    'Test',
    'Usuario',
    'TEST000101HDFRNN01',
    'test@example.com',
    'PEGAR_HASH_AQUI',
    true
);

INSERT INTO saldo (id_usuario, saldo_actual)
SELECT id_usuario, 500.00
FROM usuario
WHERE email = 'test@example.com';
```

- [ ] Usuario creado exitosamente
- [ ] Saldo asignado (500.00)

---

## 🧪 PRUEBAS POST-DEPLOYMENT

### 11. Verificar Logs de Render
- [ ] Ir a tu Web Service → Tab "Logs"
- [ ] Buscar: `🚀 Iniciando aplicación...`
- [ ] Buscar: `✅ Conexión exitosa a PostgreSQL`
- [ ] NO hay errores en rojo

### 12. Probar URL Principal
- [ ] Copiar URL de tu app: `https://tu-app.onrender.com`
- [ ] Abrir en navegador
- [ ] Página de ruleta carga correctamente
- [ ] NO aparecen errores en consola (F12)

### 13. Probar Auto-Login
- [ ] Abrir: `https://tu-app.onrender.com/?user_email=test@example.com`
- [ ] Página carga
- [ ] En Logs de Render ver: `🔌 Conexión desde App Inventor para: test@example.com`
- [ ] En Logs de Render ver: `✅ Token creado y enviado en cookie`
- [ ] Abrir consola navegador (F12)
- [ ] Buscar: `✅ Saldo cargado desde BD: 500`
- [ ] En pantalla debe mostrar saldo: 500

### 14. Probar Funcionalidad del Juego
- [ ] Hacer clic en un número de la mesa
- [ ] Seleccionar ficha (monto de apuesta)
- [ ] Aparecer botón "SPIN"
- [ ] Hacer clic en SPIN
- [ ] Ruleta gira
- [ ] Después de 10 segundos, saldo se actualiza
- [ ] En consola (F12) NO hay errores

### 15. Verificar Actualización en BD
**Antes del spin:**
```sql
SELECT email, saldo_actual FROM saldo 
JOIN usuario ON saldo.id_usuario = usuario.id_usuario 
WHERE email = 'test@example.com';
```
- [ ] Anotar saldo antes: _______

**Después del spin:**
- [ ] Ejecutar misma query
- [ ] Saldo cambió en la base de datos
- [ ] Coincide con el saldo mostrado en pantalla

---

## 📱 INTEGRACIÓN APP INVENTOR

### 16. Configurar App Inventor
```blocks
when ButtonJugar.Click
  // Después de validar login
  set WebViewer1.Url to 
    join "https://TU-URL-AQUI.onrender.com/?user_email=" 
    get global_usuario_email
```

- [ ] Código agregado en App Inventor
- [ ] WebViewer configurado
- [ ] Variable `global_usuario_email` existe

### 17. Probar Desde App Inventor
- [ ] Hacer login en App Inventor
- [ ] Click en botón que abre ruleta
- [ ] WebView se abre
- [ ] Ruleta carga correctamente
- [ ] Saldo del usuario aparece
- [ ] Poder jugar normalmente
- [ ] Saldo se actualiza tras cada spin

---

## ✅ VERIFICACIÓN FINAL

### 18. Checklist Completo
- [ ] Web Service desplegado sin errores
- [ ] PostgreSQL conectado
- [ ] Tablas creadas
- [ ] Usuario de prueba funciona
- [ ] Auto-login funciona
- [ ] Saldo se carga desde BD
- [ ] Spins actualizan BD
- [ ] App Inventor integrado (si aplica)

### 19. Documentación
- [ ] README.md revisado
- [ ] DEPLOY.md revisado
- [ ] URLs anotadas para referencia futura

---

## 🎯 TROUBLESHOOTING RÁPIDO

### Si el saldo no se carga (muestra 1000 por defecto):
1. Abrir consola navegador (F12)
2. Revisar mensajes
3. Si dice "Sin autenticación":
   - Verificar que la URL tenga `?user_email=`
   - Verificar que el email exista en BD
   - Revisar logs de Render

### Si el spin da error:
1. Abrir consola navegador (F12)
2. Ver el error específico
3. Si dice "No autenticado":
   - Cerrar y abrir nuevamente con `?user_email=`
4. Si dice "Saldo insuficiente":
   - Agregar más saldo en BD: `UPDATE saldo SET saldo_actual = 1000 WHERE id_usuario = 1;`

### Si no conecta a PostgreSQL:
1. Verificar DATABASE_URL en Render → Environment
2. Verificar logs para errores específicos
3. Revisar que `database.py` tenga el fix de `postgres://` → `postgresql://`

---

## 📊 MÉTRICAS DE ÉXITO

Al completar este checklist:
- ✅ 16 archivos desplegados
- ✅ 3 tablas en PostgreSQL
- ✅ API REST funcionando
- ✅ Autenticación JWT activa
- ✅ Auto-login para App Inventor
- ✅ Saldo sincronizado con BD
- ✅ Aplicación en producción

---

# 🎉 ¡DEPLOYMENT COMPLETADO!

**URL de tu aplicación:**
```
https://TU-APP.onrender.com
```

**URL con auto-login:**
```
https://TU-APP.onrender.com/?user_email=EMAIL_DEL_USUARIO
```

---

**Fecha de deployment:** _______________  
**Versión:** 1.0.0 - PostgreSQL Integration  
**Desarrollador:** Fernando  

**🎰 ¡Disfruta tu ruleta web con PostgreSQL! 🎰**
