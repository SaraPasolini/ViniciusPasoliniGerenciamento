// Configuração
const CONFIG = {
  USERNAME: "psicologo",
  PASSWORD: "admin123",
  API_URL: "https://api.jsonbin.io/v3/b/683c8cd08960c979a5a3def8",
  API_KEY: "$2a$10$C8Gd.lDG8n41SuN9mhADSOBLPplIWnyD/BPy80O2c1cjmvfW5KSkW",
  DASHBOARD_URL:
    "https://app.powerbi.com/view?r=eyJrIjoiODg2N2ZlMDUtNjVlYi00MzcxLTk4Y2ItMTZjNTM2NTdhOGJkIiwidCI6IjE0Y2JkNWE3LWVjOTQtNDZiYS1iMzE0LWNjMGZjOTcyYTE2MSIsImMiOjh9",
};

// Estado global
let pacientes = [];
let reagendamentos = [];
let idEditandoAtual = null;

// Inicializar aplicação
document.addEventListener("DOMContentLoaded", function () {
  carregarPacientesDaAPI();
  configurarEventListeners();
});

function configurarEventListeners() {
  // Formulário de login
  document.getElementById("loginForm").addEventListener("submit", handleLogin);

  // Formulário de adicionar paciente
  document
    .getElementById("addPatientForm")
    .addEventListener("submit", handleAdicionarPaciente);

  // Formulário de editar paciente
  document
    .getElementById("editPatientForm")
    .addEventListener("submit", handleEditarPaciente);

  // Formatação de número de telefone
  document
    .getElementById("phoneNumber")
    .addEventListener("input", formatarTelefone);
  document
    .getElementById("editPhoneNumber")
    .addEventListener("input", formatarTelefone);
}

// Autenticação
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (username === CONFIG.USERNAME && password === CONFIG.PASSWORD) {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
    carregarPacientesDaAPI();
    mostrarNotificacao("Login realizado com sucesso!", "success");
  } else {
    mostrarNotificacao("Usuário ou senha incorretos!", "error");
  }
}

function logout() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  mostrarNotificacao("Logout realizado com sucesso!", "success");
}

// Navegação por abas
function mostrarAba(nomeAba) {
  // Esconder todas as abas
  document.querySelectorAll(".tab-content").forEach((aba) => {
    aba.classList.remove("active");
  });

  // Remover classe active de todos os botões
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Mostrar aba selecionada
  const abaConteudo = document.getElementById(nomeAba + "Content");
  const abaBotao = document.getElementById(nomeAba + "Tab");

  if (abaConteudo) abaConteudo.classList.add("active");
  if (abaBotao) abaBotao.classList.add("active");

  // Carregar dados específicos para cada aba
  if (nomeAba === "edit") {
    carregarPacientes();
  } else if (nomeAba === "requests") {
    carregarReagendamentos();
  }
}

async function carregarPacientesDaAPI() {
  try {
    const response = await fetch(CONFIG.API_URL + "/latest", {
      headers: {
        "X-Master-Key": CONFIG.API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Erro ao carregar pacientes");

    const data = await response.json();
    console.log("Dados completos recebidos:", data);

    const record = data.record || {};

    pacientes = Array.isArray(record.pacientes) ? record.pacientes : [];
    reagendamentos = Array.isArray(record.reagendamentos)
      ? record.reagendamentos
      : [];

    console.log("Pacientes carregados:", pacientes);
    console.log("Reagendamentos carregados:", reagendamentos);

    carregarPacientes();

    // Só chama se reagendamentos for array e não vazio
    if (Array.isArray(reagendamentos) && reagendamentos.length > 0) {
      carregarReagendamentos(reagendamentos);
    } else {
      carregarReagendamentos([]); // Mostra mensagem "nenhum reagendamento"
    }

    atualizarEstatisticasDashboard();
  } catch (error) {
    console.error("Erro:", error);
    pacientes = [];
    reagendamentos = [];
    carregarPacientes();
    await atualizarBadgeReagendamentos();
    carregarReagendamentos([]); // Limpa lista em caso de erro
    mostrarNotificacao(
      "Erro ao carregar pacientes. Verifique o console.",
      "error"
    );
  }
}

async function atualizarBadgeReagendamentos() {
  let reagsLocal = []; // nome diferente para evitar conflito

  try {
    const response = await fetch(CONFIG.API_URL + "/latest", {
      headers: {
        "X-Master-Key": CONFIG.API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Erro ao carregar reagendamentos");

    const result = await response.json();
    console.log("Dados completos recebidos:", result);

    reagsLocal = Array.isArray(result.record?.reagendamentos)
      ? result.record.reagendamentos
      : [];

    console.log("Solicitações de reagendamentos:", reagsLocal);
  } catch (error) {
    console.error("Erro:", error);
    reagsLocal = [];
    mostrarNotificacao(
      "Erro ao carregar solicitações. Verifique o console.",
      "error"
    );
  }

  // Atualiza o badge
  const badge = document.getElementById("requestsBadge");
  if (reagsLocal.length > 0) {
    badge.textContent = reagsLocal.length;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }

  // Atualiza a variável global reagendamentos e carrega a lista
  reagendamentos = reagsLocal;
  carregarReagendamentos(reagendamentos);
}

function carregarReagendamentos(listaReagendamentosParam) {
  const listaReagendamentos = document.getElementById("requestsList");

  // Usa argumento ou global como fallback
  let lista = Array.isArray(listaReagendamentosParam)
    ? listaReagendamentosParam
    : reagendamentos;

  if (!Array.isArray(lista)) {
    console.warn(
      "Reagendamentos não é array ou não foi passado, usando variável global..."
    );
    lista = reagendamentos;
  }

  if (!lista.length) {
    listaReagendamentos.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-calendar-times text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-500 mb-2">Nenhuma solicitação de reagendamento</h3>
                <p class="text-gray-400">Quando houver solicitações, elas aparecerão aqui.</p>
            </div>
        `;
    return;
  } else {
    const reagendamentosHTML = lista
      .map((reag, index) => {
        const dataBruta = reag.data || reag.dataSolicitacao;
        if (!dataBruta) return ""; // Ignora se não houver data

        const dataObj = new Date(dataBruta);
        const dataFormatada = dataObj.toLocaleDateString("pt-BR");
        const horaFormatada = dataObj.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return `
            <div class="reschedule-card card" data-index="${index}">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div class="flex-1 mb-4 md:mb-0">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">
                            <i class="fas fa-user-clock text-primary mr-2"></i>
                            ${reag.nome || "Paciente não identificado"}
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                                <i class="fas fa-phone text-primary mr-2"></i>
                                <strong>Celular:</strong> ${formatarCelular(
                                  reag.celular
                                )}
                            </div>
                            <div>
                                <i class="fas fa-calendar-day text-primary mr-2"></i>
                                <strong>Data proposta:</strong> ${dataFormatada}
                            </div>
                            <div>
                                <i class="fas fa-clock text-primary mr-2"></i>
                                <strong>Horário:</strong> ${horaFormatada}
                            </div>
                            <div>
                                <i class="fas fa-calendar-alt text-primary mr-2"></i>
                                <strong>Data completa:</strong> ${dataObj.toLocaleString(
                                  "pt-BR"
                                )}
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-3 mt-4 md:mt-0">
                        <button onclick="aprovarReagendamento(${index})" class="btn-primary">
                            <i class="fas fa-check mr-1"></i>Aprovar
                        </button>
                    </div>
                </div>
            </div>
        `;
      })
      .join("");

    listaReagendamentos.innerHTML = reagendamentosHTML;
  }
}

async function aprovarReagendamento(index) {
  try {
    // Carrega os dados atuais
    const response = await fetch(CONFIG.API_URL + "/latest", {
      headers: {
        "X-Master-Key": CONFIG.API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Erro ao obter dados atuais");

    const dataAtual = await response.json();
    let pacientesAtuais = dataAtual.record?.pacientes || [];
    let reagendamentosAtuais = dataAtual.record?.reagendamentos || [];

    // Remove o reagendamento com base no índice
    const reagendamentosAtualizados = reagendamentosAtuais.filter((_, i) => i !== index);

    // Atualiza no JSON
    const putResponse = await fetch(CONFIG.API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": CONFIG.API_KEY,
      },
      body: JSON.stringify({
        pacientes: pacientesAtuais,
        reagendamentos: reagendamentosAtualizados,
      }),
    });

    if (!putResponse.ok) throw new Error("Erro ao atualizar reagendamentos");

    // Atualiza a variável global e a interface
    reagendamentos = reagendamentosAtualizados;
    carregarReagendamentos(reagendamentos);
    atualizarBadgeReagendamentos();

    mostrarNotificacao("Reagendamento aprovado com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao aprovar reagendamento:", error);
    mostrarNotificacao("Erro ao aprovar reagendamento", "error");
  }
}


async function handleAdicionarPaciente(e) {
  e.preventDefault();

  const frequencia = document.querySelector(
    'input[name="frequency"]:checked'
  ).value;
  const tipoConsulta = document.querySelector(
    'input[name="appointmentType"]:checked'
  ).value;
  const jaPaciente =
    document.querySelector('input[name="isPatient"]:checked').value === "true";

  const dadosPaciente = {
    nome: document.getElementById("patientName").value.trim(),
    dia: document.getElementById("dayOfWeek").value,
    hora: document.getElementById("appointmentTime").value,
    quinzenal: frequencia === "Quinzenal",
    celular: document.getElementById("phoneNumber").value.trim(),
    tipo: tipoConsulta,
    jápaciente: jaPaciente,
    obs: document.getElementById("observations").value.trim(),
    id: Date.now().toString(), // Geramos um ID único
  };

  // Validação
  if (!validarDadosPaciente(dadosPaciente)) {
    return;
  }

  try {
    // Primeiro obtemos os dados atuais
    const getResponse = await fetch(CONFIG.API_URL + "/latest", {
      headers: {
        "X-Master-Key": CONFIG.API_KEY,
      },
    });

    if (!getResponse.ok) throw new Error("Erro ao obter dados atuais");

    const currentData = await getResponse.json();
    const currentPatients = currentData.record?.pacientes || [];
    const currentReagendamentos = currentData.record?.reagendamentos || [];

    // Adicionamos o novo paciente
    const newPatients = [...currentPatients, dadosPaciente];

    // Atualizamos o bin completo mantendo a estrutura
    const putResponse = await fetch(CONFIG.API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": CONFIG.API_KEY,
      },
      body: JSON.stringify({
        pacientes: newPatients,
        reagendamentos: currentReagendamentos,
      }),
    });

    if (!putResponse.ok) throw new Error("Erro ao adicionar paciente");

    pacientes = newPatients;
    limparFormulario();
    mostrarNotificacao("Paciente adicionado com sucesso!", "success");
    atualizarEstatisticasDashboard();
    carregarPacientes();
  } catch (error) {
    console.error("Erro:", error);
    mostrarNotificacao("Erro ao adicionar paciente", "error");
  }
}

async function handleEditarPaciente(e) {
  e.preventDefault();

  const frequencia = document.querySelector(
    'input[name="editFrequency"]:checked'
  ).value;
  const tipoConsulta = document.querySelector(
    'input[name="editAppointmentType"]:checked'
  ).value;
  const jaPaciente =
    document.querySelector('input[name="editIsPatient"]:checked').value ===
    "true";

  const dadosPaciente = {
    id: document.getElementById("editPatientId").value,
    nome: document.getElementById("editPatientName").value.trim(),
    dia: document.getElementById("editDayOfWeek").value,
    hora: document.getElementById("editAppointmentTime").value,
    quinzenal: frequencia === "Quinzenal",
    celular: document.getElementById("editPhoneNumber").value.trim(),
    tipo: tipoConsulta,
    jápaciente: jaPaciente,
    obs: document.getElementById("editObservations").value.trim(),
  };

  // Validação
  if (!validarDadosPaciente(dadosPaciente)) {
    return;
  }

  try {
    // Primeiro obtemos os dados atuais
    const getResponse = await fetch(CONFIG.API_URL + "/latest", {
      headers: {
        "X-Master-Key": CONFIG.API_KEY,
      },
    });

    if (!getResponse.ok) throw new Error("Erro ao obter dados atuais");

    const currentData = await getResponse.json();
    let currentPatients = currentData.record?.pacientes || [];
    const currentReagendamentos = currentData.record?.reagendamentos || [];

    // Atualiza o paciente
    currentPatients = currentPatients.map((p) =>
      p.id === dadosPaciente.id ? dadosPaciente : p
    );

    // Atualiza mantendo a estrutura
    const putResponse = await fetch(CONFIG.API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": CONFIG.API_KEY,
      },
      body: JSON.stringify({
        pacientes: currentPatients,
        reagendamentos: currentReagendamentos,
      }),
    });

    if (!putResponse.ok) throw new Error("Erro ao atualizar paciente");

    pacientes = currentPatients;
    carregarPacientes();
    fecharModalEdicao();
    mostrarNotificacao("Paciente atualizado com sucesso!", "success");
    atualizarEstatisticasDashboard();
  } catch (error) {
    console.error("Erro:", error);
    mostrarNotificacao("Erro ao atualizar paciente", "error");
  }
}

async function excluirPaciente(id) {
  if (!confirm("Tem certeza que deseja excluir este paciente?")) {
    return;
  }

  try {
    // Primeiro obtemos os dados atuais
    const getResponse = await fetch(CONFIG.API_URL + "/latest", {
      headers: {
        "X-Master-Key": CONFIG.API_KEY,
      },
    });

    if (!getResponse.ok) throw new Error("Erro ao obter dados atuais");

    const currentData = await getResponse.json();
    let currentPatients = currentData.record?.pacientes || [];
    const currentReagendamentos = currentData.record?.reagendamentos || [];

    // Removemos o paciente
    currentPatients = currentPatients.filter((p) => p.id !== id);

    // Atualizamos o bin completo
    const putResponse = await fetch(CONFIG.API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": CONFIG.API_KEY,
      },
      body: JSON.stringify({
        pacientes: currentPatients,
      }),
    });

    if (!putResponse.ok) throw new Error("Erro ao excluir paciente");

    pacientes = currentPatients;
    carregarPacientes();
    mostrarNotificacao("Paciente excluído com sucesso!", "success");
    atualizarEstatisticasDashboard();
  } catch (error) {
    console.error("Erro:", error);
    mostrarNotificacao("Erro ao excluir paciente", "error");
  }
}

function validarDadosPaciente(dados) {
  if (!dados.nome || dados.nome.length < 2) {
    mostrarNotificacao("Nome deve ter pelo menos 2 caracteres!", "error");
    return false;
  }

  if (!dados.dia) {
    mostrarNotificacao("Selecione o dia da semana!", "error");
    return false;
  }

  if (!dados.hora) {
    mostrarNotificacao("Selecione o horário!", "error");
    return false;
  }

  if (!dados.celular || dados.celular.length < 10) {
    mostrarNotificacao("Número de celular inválido!", "error");
    return false;
  }

  if (!dados.tipo) {
    mostrarNotificacao("Selecione um tipo válido!", "error");
    return false;
  }

  if (!dados.obs) {
    mostrarNotificacao("Observação inválida!", "error");
    return false;
  }

  return true;
}

function carregarPacientes() {
  const listaPacientes = document.getElementById("patientsList");

  // Garante que pacientes é um array
  if (!Array.isArray(pacientes)) {
    console.warn("Pacientes não é array, convertendo...");
    pacientes = [];
  }

  if (pacientes.length === 0) {
    listaPacientes.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-users text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-500 mb-2">Nenhum paciente cadastrado</h3>
                    <p class="text-gray-400">Adicione seu primeiro paciente para começar.</p>
                </div>
            `;
    return;
  }

  const pacientesHTML = pacientes
    .map(
      (paciente) => `
            <div class="patient-card card" data-patient-name="${paciente.nome.toLowerCase()}">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div class="flex-1 mb-4 md:mb-0">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">
                            <i class="fas fa-user text-primary mr-2"></i>
                            ${paciente.nome}
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                                <i class="fas fa-calendar-day text-primary mr-2"></i>
                                <strong>Dia:</strong> ${
                                  paciente.dia.charAt(0).toUpperCase() +
                                  paciente.dia.slice(1)
                                }
                            </div>
                            <div>
                                <i class="fas fa-clock text-primary mr-2"></i>
                                <strong>Horário:</strong> ${paciente.hora}
                            </div>
                            <div>
                                <i class="fas fa-computer text-primary mr-2"></i>
                                <strong>Modalidade:</strong> ${
                                  paciente.tipo ? "Presencial" : "Online"
                                }
                            </div>
                            <div>
                                <i class="fas fa-question-circle text-primary mr-2"></i>
                                <strong>Já é pacientes:</strong> ${
                                  paciente.jápaciente ? "Sim" : "Não"
                                }
                            </div>
                            <div>
                                <i class="fas fa-repeat text-primary mr-2"></i>
                                <strong>Frequência:</strong> ${
                                  paciente.quinzenal ? "Quinzenal" : "Semanal"
                                }
                            </div>
                            <div>
                                <i class="fas fa-phone text-primary mr-2"></i>
                                <strong>Celular:</strong> ${paciente.celular}
                            </div>
                            <div>
                               <i class="fas fa-book text-primary mr-2"></i>
                                <strong>Observações:</strong> ${paciente.obs}
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-3">
                        <button onclick="editarPaciente('${
                          paciente.id
                        }')" class="btn-secondary">
                            <i class="fas fa-edit mr-1"></i>Editar
                        </button>
                        <button onclick="excluirPaciente('${
                          paciente.id
                        }')" class="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-all">
                            <i class="fas fa-trash mr-1"></i>Excluir
                        </button>
                    </div>
                </div>
            </div>
        `
    )
    .join("");

  listaPacientes.innerHTML = pacientesHTML;
}

function editarPaciente(id) {
  const paciente = pacientes.find((p) => p.id === id);
  if (!paciente) return;

  // Preenche os campos básicos
  document.getElementById("editPatientId").value = paciente.id;
  document.getElementById("editPatientName").value = paciente.nome;
  document.getElementById("editDayOfWeek").value = paciente.dia;
  document.getElementById("editAppointmentTime").value = paciente.hora;
  document.getElementById("editPhoneNumber").value = paciente.celular;
  document.getElementById("editAppointmentTime").value = paciente.obs;

  // Preenche radio buttons COM VERIFICAÇÃO
  const modalidade = paciente.tipo === "presencial" ? "Presencial" : "Online";
  const modalidadeRadio = document.querySelector(
    `input[name="editModalidade"][value="${modalidade}"]`
  );

  if (modalidadeRadio) {
    modalidadeRadio.checked = true;
  } else {
    console.error(
      `Radio button para modalidade "${modalidade}" não encontrado!`
    );
  }

  // Verificação para frequência
  const frequenciaRadio = document.querySelector(
    `input[name="editFrequency"][value="${
      paciente.quinzenal ? "Quinzenal" : "Semanal"
    }"]`
  );
  if (frequenciaRadio) {
    frequenciaRadio.checked = true;
  }

  // Verificação para já paciente
  const jaPacienteRadio = document.querySelector(
    `input[name="editJaPaciente"][value="${
      paciente.jápaciente ? "Sim" : "Não"
    }"]`
  );
  if (jaPacienteRadio) {
    jaPacienteRadio.checked = true;
  }

  // Exibe o modal
  document.getElementById("editModal").classList.remove("hidden");
  document.getElementById("editModal").classList.add("flex");
}

function fecharModalEdicao() {
  document.getElementById("editModal").classList.add("hidden");
  document.getElementById("editModal").classList.remove("flex");
}

function filtrarPacientes() {
  const termoBusca = document
    .getElementById("searchPatients")
    .value.toLowerCase();
  const cardsPacientes = document.querySelectorAll(".patient-card");

  cardsPacientes.forEach((card) => {
    const nomePaciente = card.getAttribute("data-patient-name");
    if (nomePaciente.includes(termoBusca)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

function limparFormulario() {
  document.getElementById("addPatientForm").reset();
}

// Dashboard
function atualizarEstatisticasDashboard() {
  const total = pacientes.length;
  const semanais = pacientes.filter((p) => !p.quinzenal).length;
  const quinzenais = pacientes.filter((p) => p.quinzenal).length;

  document.getElementById("totalPatients").textContent = total;
  document.getElementById("weeklyAppointments").textContent = semanais;
  document.getElementById("biweeklyAppointments").textContent = quinzenais;
}

function abrirDashboard() {
  window.open(CONFIG.DASHBOARD_URL, "_blank");
  mostrarNotificacao("Redirecionando para o Power BI...", "success");
}

// Funções utilitárias
function formatarCelular(input) {
  if (!input) return "";

  // Se for um input HTML, pega o valor
  const numero = typeof input === "string" ? input : input?.value || "";

  const limpo = numero.replace(/\D/g, "");

  if (limpo.length === 11) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  }

  if (limpo.length === 10) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  }

  return numero;
}

function mostrarNotificacao(mensagem, tipo = "success") {
  const notificacao = document.createElement("div");
  notificacao.className = `notification ${tipo}`;
  notificacao.innerHTML = `
            <i class="fas fa-${
              tipo === "success" ? "check-circle" : "exclamation-circle"
            } mr-2"></i>
            ${mensagem}
        `;

  document.body.appendChild(notificacao);

  setTimeout(() => {
    notificacao.remove();
  }, 3000);
}

// Fechar modal ao clicar fora
window.onclick = function (event) {
  const modal = document.getElementById("editModal");
  if (event.target === modal) {
    fecharModalEdicao();
  }
};
