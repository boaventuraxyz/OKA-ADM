function mostrarToast(mensagem, tipo) {
    var toast = document.getElementById('toastApp');
    if (!toast) return;

    var ehErro = tipo !== 's';
    toast.textContent = mensagem;

    // Reseta estados preservando a classe base 'meutoast'
    toast.classList.remove('show', 'error');
    if (ehErro) toast.classList.add('error');

    // Força reflow para reiniciar a animação em chamadas seguidas
    void toast.offsetWidth;
    toast.classList.add('show');

    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
        toast.classList.remove('show');
    }, 3000);
}
const form = document.getElementById('formAssinar');
const campanhaID = document.getElementById('campanhaID');
    const nome = document.getElementById('nome');
const token = document.querySelector('input[name="__RequestVerificationToken"]').value;
    const tel = document.getElementById('tel');
    const mail = document.getElementById('mail');
    const rua = document.getElementById('rua');
    const numero = document.getElementById('numero');
    const cep = document.getElementById('cep');

    const erroNome = document.getElementById('erroNome');
    const erroTel = document.getElementById('erroTel');
    const erroMail = document.getElementById('erroMail');
    const erroRua = document.getElementById('erroRua');
    const erroCep = document.getElementById('erroCep');

    function apenasNumeros(valor) {
        return valor.replace(/\D/g, '');
    }

    function validarNome(valor) {
        const nomeLimpo = valor.trim().replace(/\s+/g, ' ');
        return nomeLimpo.length >= 5 && nomeLimpo.split(' ').length >= 2;
    }

function validarEmail(valor) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

    function validarTelefoneBR(valor) {
        const numeros = apenasNumeros(valor);

        if (numeros.length < 10 || numeros.length > 11) return false;
        if (/^(\d)\1+$/.test(numeros)) return false;

        const ddd = parseInt(numeros.substring(0, 2), 10);
        if (ddd < 11 || ddd > 99) return false;

        if (numeros.length === 11) {
            return numeros[2] === '9';
        }

        return /^[1-8]/.test(numeros[2]);
    }

    function validarCep(valor) {
        return /^\d{5}-?\d{3}$/.test(valor.trim());
    }

    function validarRuaNumero() {
        return rua.value.trim().length >= 3 && numero.value.trim().length >= 1;
    }

    function mostrarErro(input, erroEl, temErro) {
        input.classList.toggle('error', temErro);
        erroEl.style.display = temErro ? 'block' : 'none';
    }

    function formatarTelefone(valor) {
        const numeros = apenasNumeros(valor).slice(0, 11);

        if (numeros.length <= 10) {
            return numeros
                .replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, function (_, a, b, c) {
                    let resultado = '';
                    if (a) resultado += '(' + a;
                    if (a.length === 2) resultado += ') ';
                    if (b) resultado += b;
                    if (c) resultado += '-' + c;
                    return resultado;
                });
        }

        return numeros.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    }

    function formatarCep(valor) {
        const numeros = apenasNumeros(valor).slice(0, 8);
        return numeros.replace(/^(\d{5})(\d{0,3}).*/, function (_, a, b) {
            return b ? a + '-' + b : a;
        });
    }

    tel.addEventListener('input', function () {
        tel.value = formatarTelefone(tel.value);
        mostrarErro(tel, erroTel, tel.value.trim() !== '' && !validarTelefoneBR(tel.value));
    });

    cep.addEventListener('input', function () {
        cep.value = formatarCep(cep.value);
        mostrarErro(cep, erroCep, cep.value.trim() !== '' && !validarCep(cep.value));
    });

    nome.addEventListener('blur', function () {
        mostrarErro(nome, erroNome, !validarNome(nome.value));
    });

    mail.addEventListener('blur', function () {
        mostrarErro(mail, erroMail, !validarEmail(mail.value));
    });

    rua.addEventListener('blur', function () {
        const invalido = !validarRuaNumero() && (rua.value.trim() !== '' || numero.value.trim() !== '');
        mostrarErro(rua, erroRua, invalido);
        numero.classList.toggle('error', invalido);
    });

    numero.addEventListener('blur', function () {
        const invalido = !validarRuaNumero() && (rua.value.trim() !== '' || numero.value.trim() !== '');
        mostrarErro(rua, erroRua, invalido);
        numero.classList.toggle('error', invalido);
    });

function handleSign() {
    const nomeInvalido = !validarNome(nome.value);
    const telInvalido = !validarTelefoneBR(tel.value);
    const mailInvalido = !validarEmail(mail.value);
    const ruaNumeroInvalido = !validarRuaNumero();
    const cepInvalido = !validarCep(cep.value);

    mostrarErro(nome, erroNome, nomeInvalido);
    mostrarErro(tel, erroTel, telInvalido);
    mostrarErro(mail, erroMail, mailInvalido);
    mostrarErro(rua, erroRua, ruaNumeroInvalido);
    numero.classList.toggle('error', ruaNumeroInvalido);
    mostrarErro(cep, erroCep, cepInvalido);

    if (nomeInvalido || telInvalido || mailInvalido || ruaNumeroInvalido || cepInvalido) {
        return;
    }

    const formData = new FormData();

    // dados
    formData.append("NomeAssinante", nome.value);
    formData.append("NumeroAssinante", tel.value);
    formData.append("EmailAssinante", mail.value);
    formData.append("EnderecoAssinante", rua.value);
    formData.append("NAssinante", numero.value);
    formData.append("CepAssinante", cep.value);
    formData.append("CidadeAssinante", cidade.value);
    formData.append("EstadoAssinante", estado.value);
    formData.append("CampanhaId", campanhaID.value);

    // 🔥 token (pegando direto do input real)
    formData.append(
        "__RequestVerificationToken",
        document.querySelector('input[name="__RequestVerificationToken"]').value
    );

    fetch('/Formulario/Create', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
        .then(res => {
            if (!res.ok) throw new Error("Erro ao salvar");
            return res.json();
        })
        .then(data => {
            mostrarToast('Assinatura realizada com sucesso!', 's');
            setTimeout(() => {
                window.location.href = "https://chat.whatsapp.com/C3ShiDCMTdtKlzWVmw9AfP?s=cl&p=a&mlu=1";
            }, 1500); // espera o toast aparecer
        })
        .catch(err => {
            console.error(err);
            mostrarToast('Erro ao enviar formulário','e');
        });
}
/* ── Máscara CEP + busca ViaCEP ── */
document.addEventListener('DOMContentLoaded', function () {
    var cepInput = document.getElementById('cep');

    cepInput.addEventListener('input', function (e) {
        var v = e.target.value.replace(/\D/g, '').slice(0, 8);
        if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
        e.target.value = v;

        if (v.replace(/\D/g, '').length === 8) {
            buscarCEP(v.replace(/\D/g, ''));
        }
    });

    fetchRemoteCount(false);
});

function buscarCEP(cep) {
    fetch('https://viacep.com.br/ws/' + cep + '/json/')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (!data.erro) {
                var ruaInput = document.getElementById('rua');
                var ufInput = document.getElementById('estado');
                var cddInput = document.getElementById('cidade');
                ruaInput.value = data.logradouro || '';
                ufInput.value = data.uf || '';
                cddInput.value = data.localidade || '';
                document.getElementById('numero').focus();
            }
        })
        .catch(function (err) { console.warn('CEP não encontrado:', err); });
}
function atualizarProgresso(total, meta ) {
    if (!meta || meta <= 0) return;
    
    const porcentagem = Math.min((total / meta) * 100, 100);

    // elementos
    const progressFill = document.getElementById("progressFill");
    const progressPct = document.getElementById("progressPct");
    const progressCount = document.getElementById("progressCount");
    const liveNum = document.getElementById("liveNum");
    const remainingText = document.getElementById("remainingText");

    // atualiza barra
    progressFill.style.width = porcentagem + "%";

    // texto %
    progressPct.textContent = Math.floor(porcentagem) + "%";

    // contador principal
    liveNum.textContent = total.toLocaleString('pt-BR');

    // restante
    const restante = Math.max(meta - total, 0);
    remainingText.textContent = `Faltam ${restante.toLocaleString('pt-BR')} para a meta`;

    // texto inferior
    progressCount.innerHTML = `
        ${total.toLocaleString('pt-BR')} 
        <span>/ Meta: ${meta.toLocaleString('pt-BR')}</span>
    `;
}
