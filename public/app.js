const SVG_EYE_OPEN_TEMP = `<svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M9.67 0C5.27455 0 1.52083 2.73397 0 6.59318C1.52083 10.4524 5.27455 13.1864 9.67 13.1864C14.0655 13.1864 17.8192 10.4524 19.34 6.59318C17.8192 2.73397 14.0655 0 9.67 0ZM9.6702 10.989C7.24391 10.989 5.27474 9.0198 5.27474 6.59351C5.27474 4.16722 7.24391 2.19806 9.6702 2.19806C12.0965 2.19806 14.0657 4.16722 14.0657 6.59351C14.0657 9.0198 12.0965 10.989 9.6702 10.989ZM7.0325 6.59358C7.0325 5.13429 8.21048 3.95631 9.66977 3.95631C11.1291 3.95631 12.307 5.13429 12.307 6.59358C12.307 8.05287 11.1291 9.23085 9.66977 9.23085C8.21048 9.23085 7.0325 8.05287 7.0325 6.59358Z" fill="#B2B2B2"/>
</svg>`;

const SVG_EYE_OPEN = `<svg width="20" height="17" viewBox="0 0 20 17" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9.67 3.517C10.837 3.517 11.9561 3.98057 12.7813 4.80573C13.6064 5.63089 14.07 6.75005 14.07 7.917C14.0697 8.46872 13.9624 9.01514 13.754 9.526L16.321 12.093C17.6606 10.9761 18.6975 9.54001 19.336 7.917C18.5719 5.97457 17.241 4.30699 15.5164 3.13116C13.7918 1.95532 11.7533 1.32564 9.666 1.324C8.4724 1.32341 7.2879 1.53154 6.166 1.939L8.066 3.839C8.57489 3.62921 9.11957 3.51987 9.67 3.517ZM0.879 1.117L2.879 3.117L3.279 3.517C1.8117 4.66149 0.679159 6.17949 0 7.912C0.500555 9.18638 1.24798 10.3493 2.19934 11.3339C3.15069 12.3186 4.28722 13.1055 5.54364 13.6496C6.80006 14.1937 8.1516 14.4841 9.52061 14.5043C10.8896 14.5244 12.2491 14.2739 13.521 13.767L13.89 14.136L16.466 16.7L17.582 15.584L2 0L0.879 1.117ZM5.741 5.978L7.1 7.341C7.0546 7.52797 7.0311 7.7196 7.03 7.912C7.02947 8.25874 7.09741 8.60218 7.22992 8.9226C7.36243 9.24303 7.55691 9.53414 7.80218 9.77923C8.04746 10.0243 8.33872 10.2186 8.65924 10.3508C8.97977 10.4831 9.32326 10.5508 9.67 10.55C9.8624 10.5489 10.054 10.5254 10.241 10.48L11.6 11.842C10.7797 12.2531 9.85076 12.3953 8.94504 12.2485C8.03932 12.1018 7.20283 11.6735 6.55431 11.0244C5.90579 10.3753 5.47819 9.53846 5.3322 8.63262C5.18621 7.72677 5.32924 6.79795 5.741 5.978ZM9.53 5.292L12.3 8.062L12.318 7.921C12.3184 7.57459 12.2505 7.23151 12.1181 6.9114C11.9857 6.59128 11.7915 6.30043 11.5465 6.05548C11.3016 5.81053 11.0107 5.61631 10.6906 5.48393C10.3705 5.35154 10.0274 5.28361 9.681 5.284L9.53 5.292Z" fill="#B2B2B2"/>
</svg>`;

// Alterna visibilidade da senha e troca o ícone
function togglePassword(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn   = document.getElementById(btnId);
    if (input.type === 'password') {
        input.type   = 'text';
        btn.innerHTML = SVG_EYE_CLOSED;
    } else {
        input.type   = 'password';
        btn.innerHTML = SVG_EYE_OPEN;
    }
}

function initGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: '1028574982057-0r7lgb2t6hchc6s4177r8fh1tqu9or5r.apps.googleusercontent.com',
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
    });
    google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'outline', size: 'large', width: 340, text: 'signin_with', locale: 'pt-BR' }
    );
}

async function handleGoogleCredential(response) {
    const feedback = document.getElementById('googleFeedback');
    if (feedback) feedback.innerText = 'Autenticando com Google...';
    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();
        if (res.ok && data.require2FA) {
            window.location.href = '/mfa.html';
        } else if (res.ok) {
            window.location.href = '/dashboard.html';
        } else {
            if (feedback) feedback.innerText = data.error || 'Erro ao autenticar com Google.';
        }
    } catch (erro) {
        console.error('Erro no login Google:', erro);
        if (feedback) feedback.innerText = 'Erro ao conectar com o servidor.';
    }
}

async function handleSignup() {
    const userElement  = document.getElementById('signupUser');
    const emailElement = document.getElementById('signupEmail');
    const passElement  = document.getElementById('signupPass');
    const lgpdCheck    = document.getElementById('lgpdCheck');
    const feedback     = document.getElementById('signupFeedback');
    const successBox   = document.getElementById('successBox');

    if (!userElement.value || !emailElement.value || !passElement.value) {
        feedback.innerText = "Preencha usuário, e-mail e senha!";
        return;
    }
    if (!lgpdCheck.checked) {
        feedback.innerText = "Você precisa concordar com os Termos de Uso para criar uma conta.";
        return;
    }

    feedback.innerText = "Criando conta... aguarde.";

    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username:     userElement.value,
                email:        emailElement.value.trim().toLowerCase(),
                password:     passElement.value,
                lgpdAccepted: true,
            })
        });
        const data = await res.json();
        feedback.innerText = data.error || "";
        if (res.ok && data.qrCodeUrl) {
            document.getElementById('qrCodeImg').src = data.qrCodeUrl;
            successBox.classList.remove('d-none');
            feedback.innerText = "";
        }
    } catch (erro) {
        console.error("Erro capturado:", erro);
        feedback.innerText = "Erro ao conectar com o servidor.";
    }
}

async function submitLogin() {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password   = document.getElementById('loginPass').value;
    const feedback   = document.getElementById('loginFeedback');

    if (!identifier || !password) {
        feedback.innerText = "Preencha o usuário/e-mail e a senha!";
        return;
    }
    feedback.innerText = "Autenticando...";

    const isEmail = identifier.includes('@');
    const payload = isEmail
        ? { email: identifier.toLowerCase(), password }
        : { username: identifier, password };

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.require2FA) {
            window.location.href = '/mfa.html';
        } else {
            feedback.innerText = data.error || data.message;
        }
    } catch (erro) {
        console.error("Erro no login:", erro);
        feedback.innerText = "Erro ao conectar com o servidor.";
    }
}

function selectMethod(method) {
    const panelApp   = document.getElementById('panelApp');
    const panelEmail = document.getElementById('panelEmail');
    const btnApp     = document.getElementById('btnApp');
    const btnEmail   = document.getElementById('btnEmail');
    document.getElementById('mfaFeedback').innerText = '';

    if (method === 'app') {
        panelApp.classList.remove('d-none');
        panelEmail.classList.add('d-none');
        btnApp.classList.replace('btn-outline-warning', 'btn-warning');
        btnApp.classList.add('text-dark');
        btnEmail.classList.replace('btn-warning', 'btn-outline-warning');
        btnEmail.classList.remove('text-dark');
    } else {
        panelEmail.classList.remove('d-none');
        panelApp.classList.add('d-none');
        btnEmail.classList.replace('btn-outline-warning', 'btn-warning');
        btnEmail.classList.add('text-dark');
        btnApp.classList.replace('btn-warning', 'btn-outline-warning');
        btnApp.classList.remove('text-dark');
    }
}

async function submitMfa() {
    const codeElement = document.getElementById('mfaCode');
    const feedback    = document.getElementById('mfaFeedback');
    if (!codeElement.value) { feedback.innerText = "Digite o código de 6 dígitos."; return; }
    feedback.innerText = "Validando token...";
    try {
        const res = await fetch('/api/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: codeElement.value })
        });
        const data = await res.json();
        if (res.ok) { window.location.href = '/dashboard.html'; }
        else { feedback.innerText = data.error || data.message; }
    } catch (erro) { feedback.innerText = "Erro ao validar o token."; }
}

async function sendMfaByEmail() {
    const feedback = document.getElementById('mfaFeedback');
    feedback.innerText = "Enviando código...";
    try {
        const res = await fetch('/api/send-mfa-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (res.ok) {
            feedback.innerText = "";
            document.getElementById('emailStep1').classList.add('d-none');
            document.getElementById('emailStep2').classList.remove('d-none');
        } else {
            feedback.innerText = data.error || "Erro ao enviar o código.";
        }
    } catch (erro) { feedback.innerText = "Erro ao conectar com o servidor."; }
}

async function submitMfaEmail() {
    const codeElement = document.getElementById('mfaEmailCode');
    const feedback    = document.getElementById('mfaFeedback');
    if (!codeElement.value) { feedback.innerText = "Digite o código de 6 dígitos."; return; }
    feedback.innerText = "Validando código...";
    try {
        const res = await fetch('/api/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: codeElement.value, method: 'email' })
        });
        const data = await res.json();
        if (res.ok) { window.location.href = '/dashboard.html'; }
        else { feedback.innerText = data.error || data.message; }
    } catch (erro) { feedback.innerText = "Erro ao validar o código."; }
}


async function verifySessionOnLoad() {
    const feedback = document.getElementById('sessionStatus');
    try {
        const res  = await fetch('/api/dashboard');
        const data = await res.json();
        if (!res.ok) { window.location.href = '/'; }
        else {
            feedback.innerText = "Sessão Ativa e Validada Pelo Backend: " + data.message;
            feedback.classList.add('text-success');
        }
    } catch (erro) { window.location.href = '/'; }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (erro) { console.error("Erro no Logout:", erro); }
}

async function recoverStep1() {
    const userElement = document.getElementById('recoverUser');
    const feedback    = document.getElementById('recoverFeedback1');
    if (!userElement.value.trim()) { feedback.innerText = "Informe o usuário."; return; }
    feedback.innerText = "Verificando...";
    try {
        const res = await fetch('/api/recover/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userElement.value.trim() })
        });
        const data = await res.json();
        if (res.ok) {
            feedback.innerText = "";
            document.getElementById('step1').classList.add('d-none');
            document.getElementById('step2').classList.remove('d-none');
            document.getElementById('step-badge-1').classList.replace('bg-primary', 'bg-success');
            document.getElementById('step-badge-2').classList.replace('bg-secondary', 'bg-warning');
            document.getElementById('step-badge-2').classList.add('text-dark');
        } else { feedback.innerText = data.error || "Erro ao verificar usuário."; }
    } catch (erro) { feedback.innerText = "Erro ao conectar com o servidor."; }
}

async function recoverStep2() {
    const codeElement = document.getElementById('recoverMfaCode');
    const feedback    = document.getElementById('recoverFeedback2');
    if (!codeElement.value.trim()) { feedback.innerText = "Digite o código de 6 dígitos."; return; }
    feedback.innerText = "Validando...";
    try {
        const res = await fetch('/api/recover/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: codeElement.value.trim() })
        });
        const data = await res.json();
        if (res.ok) {
            feedback.innerText = "";
            document.getElementById('step2').classList.add('d-none');
            document.getElementById('step3').classList.remove('d-none');
            document.getElementById('step-badge-2').classList.replace('bg-warning', 'bg-success');
            document.getElementById('step-badge-2').classList.remove('text-dark');
            document.getElementById('step-badge-3').classList.replace('bg-secondary', 'bg-success');
        } else { feedback.innerText = data.error || "Código inválido ou expirado."; }
    } catch (erro) { feedback.innerText = "Erro ao conectar com o servidor."; }
}

async function recoverStep3() {
    const newPass     = document.getElementById('newPassword');
    const confirmPass = document.getElementById('confirmPassword');
    const feedback    = document.getElementById('recoverFeedback3');
    if (!newPass.value || !confirmPass.value) { feedback.innerText = "Preencha os dois campos de senha."; return; }
    if (newPass.value.length < 8) { feedback.innerText = "A senha deve ter no mínimo 8 caracteres."; return; }
    if (newPass.value !== confirmPass.value) { feedback.innerText = "As senhas não coincidem."; return; }
    feedback.innerText = "Salvando...";
    try {
        const res = await fetch('/api/recover/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPass.value })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('step3').classList.add('d-none');
            document.getElementById('stepSuccess').classList.remove('d-none');
        } else { feedback.innerText = data.error || "Erro ao redefinir senha."; }
    } catch (erro) { feedback.innerText = "Erro ao conectar com o servidor."; }
}