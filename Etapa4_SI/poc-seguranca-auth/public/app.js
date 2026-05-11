// public/app.js

async function handleSignup() {
    const userElement = document.getElementById('signupUser');
    const passElement = document.getElementById('signupPass');
    const feedback = document.getElementById('signupFeedback');
    const successBox = document.getElementById('successBox');

    if (!userElement.value || !passElement.value) {
        feedback.innerText = "Preencha usuário e senha!";
        return;
    }

    feedback.innerText = "Criando conta... aguarde.";

    try {
        const res = await fetch('/api/signup', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: userElement.value, password: passElement.value })
        });
        
        const data = await res.json();
        feedback.innerText = data.error || "";
        
        if(res.ok && data.qrCodeUrl) {
            const img = document.getElementById('qrCodeImg');
            img.src = data.qrCodeUrl;
            successBox.classList.remove('d-none');
            feedback.innerText = "";
        }
    } catch (erro) {
        console.error("Erro capturado:", erro);
        feedback.innerText = "Erro ao conectar com o servidor.";
    }
}

async function submitLogin() {
    const userElement = document.getElementById('loginUser');
    const passElement = document.getElementById('loginPass');
    const feedback = document.getElementById('loginFeedback');

    if (!userElement.value || !passElement.value) {
        feedback.innerText = "Preencha usuário e senha!";
        return;
    }

    feedback.innerText = "Autenticando...";

    try {
        const res = await fetch('/api/login', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: userElement.value, password: passElement.value })
        });
        const data = await res.json();
        
        if(res.ok && data.require2FA) {
            window.location.href = '/mfa.html';
        } else {
            feedback.innerText = data.error || data.message;
        }
    } catch (erro) {
        console.error("Erro no login:", erro);
        feedback.innerText = "Erro ao conectar com o servidor.";
    }
}

async function submitMfa() {
    const codeElement = document.getElementById('mfaCode');
    const feedback = document.getElementById('mfaFeedback');

    if (!codeElement.value) {
        feedback.innerText = "Digite o código de 6 dígitos.";
        return;
    }

    feedback.innerText = "Validando token...";

    try {
        const res = await fetch('/api/verify-token', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: codeElement.value })
        });
        
        const data = await res.json();
        
        if(res.ok) {
            window.location.href = '/dashboard.html';
        } else {
            feedback.innerText = data.error || data.message;
        }
    } catch (erro) {
        console.error("Erro no MFA:", erro);
        feedback.innerText = "Erro ao validar o token.";
    }
}

// Executado automaticamente ao carregar o dashboard.html
async function verifySessionOnLoad() {
    const feedback = document.getElementById('sessionStatus');
    try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        
        if (!res.ok) {
            window.location.href = '/'; // Expulsa para o login se não tiver sessão
        } else {
            feedback.innerText = "Sessão Ativa e Validada Pelo Backend: " + data.message;
            feedback.classList.add('text-success');
        }
    } catch (erro) {
        window.location.href = '/';
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/'; // Redireciona para login
    } catch (erro) {
        console.error("Erro no Logout:", erro);
    }
}

// Etapa 1: valida o nome de usuário
async function recoverStep1() {
    const userElement = document.getElementById('recoverUser');
    const feedback = document.getElementById('recoverFeedback1');

    if (!userElement.value.trim()) {
        feedback.innerText = "Informe o usuário.";
        return;
    }

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
            // Avança para etapa 2
            document.getElementById('step1').classList.add('d-none');
            document.getElementById('step2').classList.remove('d-none');
            document.getElementById('step-badge-1').classList.replace('bg-primary', 'bg-success');
            document.getElementById('step-badge-2').classList.replace('bg-secondary', 'bg-warning');
            document.getElementById('step-badge-2').classList.add('text-dark');
        } else {
            feedback.innerText = data.error || "Erro ao verificar usuário.";
        }
    } catch (erro) {
        console.error("Erro na recuperação (etapa 1):", erro);
        feedback.innerText = "Erro ao conectar com o servidor.";
    }
}

// Etapa 2: valida o token 2FA para confirmar identidade
async function recoverStep2() {
    const codeElement = document.getElementById('recoverMfaCode');
    const feedback = document.getElementById('recoverFeedback2');

    if (!codeElement.value.trim()) {
        feedback.innerText = "Digite o código de 6 dígitos.";
        return;
    }

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
            // Avança para etapa 3
            document.getElementById('step2').classList.add('d-none');
            document.getElementById('step3').classList.remove('d-none');
            document.getElementById('step-badge-2').classList.replace('bg-warning', 'bg-success');
            document.getElementById('step-badge-2').classList.remove('text-dark');
            document.getElementById('step-badge-3').classList.replace('bg-secondary', 'bg-success');
        } else {
            feedback.innerText = data.error || "Código inválido ou expirado.";
        }
    } catch (erro) {
        console.error("Erro na recuperação (etapa 2):", erro);
        feedback.innerText = "Erro ao conectar com o servidor.";
    }
}

// Etapa 3: define a nova senha
async function recoverStep3() {
    const newPass = document.getElementById('newPassword');
    const confirmPass = document.getElementById('confirmPassword');
    const feedback = document.getElementById('recoverFeedback3');

    if (!newPass.value || !confirmPass.value) {
        feedback.innerText = "Preencha os dois campos de senha.";
        return;
    }

    if (newPass.value.length < 8) {
        feedback.innerText = "A senha deve ter no mínimo 8 caracteres.";
        return;
    }

    if (newPass.value !== confirmPass.value) {
        feedback.innerText = "As senhas não coincidem.";
        return;
    }

    feedback.innerText = "Salvando...";

    try {
        const res = await fetch('/api/recover/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPass.value })
        });

        const data = await res.json();

        if (res.ok) {
            // Exibe tela de sucesso
            document.getElementById('step3').classList.add('d-none');
            document.getElementById('stepSuccess').classList.remove('d-none');
        } else {
            feedback.innerText = data.error || "Erro ao redefinir senha.";
        }
    } catch (erro) {
        console.error("Erro na recuperação (etapa 3):", erro);
        feedback.innerText = "Erro ao conectar com o servidor.";
    }
}
