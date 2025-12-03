// ========================================================
// INTEGRACIÓN CON BASE DE DATOS - CARGA DESPUÉS DE APP.JS
// ========================================================

const API_URL_DB = window.location.origin;

// Sobrescribir balance inicial a 0 (se cargará desde BD)
bankValue = 0;

// Referencias al DOM
const loginModal = document.getElementById('loginModal');
const loginError = document.getElementById('loginError');

// Cargar saldo desde la base de datos
async function loadBalanceFromDB() {
    try {
        const response = await fetch(`${API_URL_DB}/api/saldo`, {
            credentials: 'include'  // CLAVE: Envía cookie automáticamente
        });

        if (response.ok) {
            const data = await response.json();
            bankValue = data.saldo;
            updateBalance();
            console.log('✅ Saldo cargado desde BD:', bankValue);
            
            // Si el login fue exitoso, ocultar modal si estaba abierto
            if (loginModal) loginModal.style.display = 'none';
            
        } else if (response.status === 401) {
            console.log('🔒 Usuario no autenticado. Mostrando login...');
            if (loginModal) loginModal.style.display = 'flex';
        } else {
            console.log('⚠️ Error desconocido, usando saldo por defecto');
            bankValue = 1000; 
            updateBalance();
        }
    } catch (error) {
        console.log('⚠️ Error cargando saldo:', error);
        // En caso de error de red, quizás no mostrar login inmediatamente o mostrar error
    }
}

// Función para enviar login manual
async function submitLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showError('Por favor completa todos los campos');
        return;
    }

    try {
        const response = await fetch(`${API_URL_DB}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Login exitoso:', data);
            
            // Guardar token en cookie (aunque el backend ya debería haberlo hecho si usara cookies, 
            // pero aquí el backend devuelve token en JSON, así que lo guardamos manualmente si es necesario
            // OJO: El backend actual devuelve token en JSON pero NO lo setea en cookie en el endpoint /api/auth/login
            // Necesitamos guardar ese token en una cookie para que las siguientes peticiones funcionen
            
            document.cookie = `access_token=${data.token}; path=/; max-age=604800; samesite=lax`;
            
            // Recargar saldo y ocultar modal
            loadBalanceFromDB();
            
        } else {
            const errorData = await response.json();
            showError(errorData.detail || 'Error al iniciar sesión');
        }
    } catch (error) {
        console.error('Error login:', error);
        showError('Error de conexión');
    }
}

function showError(msg) {
    if (loginError) {
        loginError.innerText = msg;
        loginError.style.display = 'block';
    }
}

// Función para actualizar el display del balance
function updateBalance() {
    const bankSpan = document.getElementById('bankSpan');
    if (bankSpan) {
        bankSpan.innerText = '' + bankValue.toLocaleString("en-GB") + '';
    }
}

// Cargar saldo al iniciar la página
loadBalanceFromDB();
