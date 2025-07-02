// Função para decodificar JWT (base64)
function parseJwt (token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

document.getElementById('logout-btn').addEventListener('click', logout);

(function() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  const payload = parseJwt(token);
  if (!payload) {
    logout();
    return;
  }
  // Tentar obter o nome do utilizador do payload (se backend enviar)
  // Se não, buscar via API user
  fetch('http://localhost:3000/api/user', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(res => res.json())
    .then(data => {
      if (data.nome) {
        // Update only the username span to preserve effects
        const userGlint = document.getElementById('user-glint');
        if (userGlint) {
          userGlint.textContent = data.nome;
        } else {
          // fallback if structure changes
          document.getElementById('user-greeting').textContent = `Olá, ${data.nome}`;
        }
      } else {
        const userGlint = document.getElementById('user-glint');
        if (userGlint) {
          userGlint.textContent = 'Utilizador';
        } else {
          document.getElementById('user-greeting').textContent = 'Olá, Utilizador';
        }
      }
    })
    .catch(() => {
      document.getElementById('user-greeting').textContent = 'Olá, Utilizador';
    });
})();

// --- NAVIGATION LOGIC ---

document.addEventListener('DOMContentLoaded', function() {
  const navBtns = [
    document.getElementById('home-btn'),
    document.getElementById('nav-saldo'),
    document.getElementById('nav-transacoes'),
    document.getElementById('nav-poupancas'),
    document.getElementById('auto-btn')
  ];
  const navIds = ['inicio', 'saldo', 'transacoes', 'poupancas', 'automaticas'];
  const main = document.querySelector('.dashboard-main');

  // Helper: Remove active from all
  function clearActive() {
    navBtns.forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
  }

  // Helper: Atualiza os valores do resumo no dashboard
  function atualizarResumo(transacoes) {
    let saldo = 0, receitas = 0, despesas = 0;
    transacoes.forEach(t => {
      if (t.tipo === 'rendimento') receitas += Number(t.preco);
      else if (t.tipo === 'despesa') despesas += Number(t.preco);
    });
    saldo = receitas - despesas;

    // Buscar total poupado nas poupancas do utilizador
    const poupancasEl = document.getElementById('total-poupancas');
    if (poupancasEl) {
      // Busca poupancas do backend e soma valorAtual
      fetch('http://localhost:3000/api/poupancas', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      })
        .then(res => res.ok ? res.json() : [])
        .then(poupancas => {
          let total = 0;
          if (Array.isArray(poupancas)) {
            total = poupancas.reduce((acc, p) => acc + Number(p.valorAtual || 0), 0);
          }
          poupancasEl.textContent = `€${total.toFixed(2)}`;
        })
        .catch(() => {
          poupancasEl.textContent = '€0.00';
        });
    }

    const saldoEl = document.getElementById('saldo-atual');
    const receitasEl = document.getElementById('total-receitas');
    const despesasEl = document.getElementById('total-despesas');
    if (saldoEl) saldoEl.textContent = `€${saldo.toFixed(2)}`;
    if (receitasEl) receitasEl.textContent = `€${receitas.toFixed(2)}`;
    if (despesasEl) despesasEl.textContent = `€${despesas.toFixed(2)}`;
    // Atualiza total de transações se existir
    const totalTransacoes = document.getElementById('total-transacoes');
    if (totalTransacoes) totalTransacoes.textContent = transacoes.length;
  }

  // Helper: Render placeholder content
  function renderPlaceholder(section) {
    let html = '';
    switch(section) {
      case 'inicio':
        html = `
        <section class="dashboard-inicio" style="gap:2.5rem;">
          <div class="dashboard-home-header" style="display:flex;align-items:center;justify-content:space-between;gap:2rem;margin-bottom:1.5rem;">
            <div>
              <h1 style="font-size:2.3rem;color:var(--text-main);font-weight:700;letter-spacing:0.01em;margin:0 0 0.2em 0;line-height:1.1;">
                <i class="fa-solid fa-house" style="color:var(--text-accent);margin-right:0.5em;"></i>
                Painel Geral
              </h1>
              <div style="color:var(--text-secondary);font-size:1.13em;font-weight:500;">
                Bem-vindo de volta ao seu resumo financeiro.
              </div>
            </div>
            <div class="dashboard-meta" style="gap:1.5rem;">
              <div class="meta-item"><i class="fa fa-list"></i> <span style="font-weight:500;">Transações:</span> <b id="total-transacoes">0</b></div>
              <div class="meta-item"><i class="fa fa-calendar"></i> <span style="font-weight:500;">Período:</span>
                <select id="dashboard-periodo" style="background:var(--background-card);color:var(--text-main);border-radius:0.5em;border:1.5px solid var(--border-main);font-size:1em;padding:0.2em 0.7em;margin-left:0.3em;">
                  <option value="hoje">Hoje</option>
                  <option value="ontem">Ontem</option>
                  <option value="esta-semana">Esta semana</option>
                  <option value="semana-passada">Semana passada</option>
                  <option value="este-mes" selected>Este mês</option>
                  <option value="mes-passado">Mês passado</option>
                  <option value="este-ano">Este ano</option>
                  <option value="ano-passado">Ano passado</option>
                  <option value="tudo">Tudo</option>
                </select>
              </div>
            </div>
          </div>
          <div class="dashboard-resumo" style="margin:0 0 1.5rem 0;gap:2.2rem;">
            <div class="resumo-card saldo">
              <span class="resumo-titulo"><i class="fa fa-wallet"></i> Saldo Atual</span>
              <span class="resumo-valor" id="saldo-atual">€0,00</span>
            </div>
            <div class="resumo-card receitas">
              <span class="resumo-titulo"><i class="fa fa-arrow-down"></i> Receitas</span>
              <span class="resumo-valor" id="total-receitas">€0,00</span>
            </div>
            <div class="resumo-card despesas">
              <span class="resumo-titulo"><i class="fa fa-arrow-up"></i> Despesas</span>
              <span class="resumo-valor" id="total-despesas">€0,00</span>
            </div>
            <div class="resumo-card poupancas">
              <span class="resumo-titulo"><i class="fa fa-piggy-bank"></i> Poupanças</span>
              <span class="resumo-valor" id="total-poupancas">€0,00</span>
            </div>
          </div>
          <div class="dashboard-graficos" style="gap:2.5rem;flex-wrap:wrap;">
            <div class="grafico-card">
              <div class="chart-title">Despesas por Categoria</div>
              <canvas id="grafico-despesas-categorias" style="max-width:350px;max-height:350px;width:100%;height:350px;"></canvas>
            </div>
            <div class="grafico-card">
              <div class="chart-title">Evolução do Saldo</div>
              <canvas id="grafico-evolucao-saldo" style="max-width:420px;max-height:350px;width:100%;height:350px;"></canvas>
            </div>
            <div class="grafico-card">
              <div class="chart-title">Receitas vs Despesas</div>
              <canvas id="grafico-receitas-despesas" style="max-width:350px;max-height:350px;width:100%;height:350px;"></canvas>
            </div>
          </div>
          <div class="dashboard-meta" style="margin-top:2rem;gap:2rem;">
            <div class="meta-item" id="dashboard-tip" style="color:var(--text-accent);font-size:1.08em;">
              <!-- Dica financeira será preenchida via JS -->
            </div>
          </div>
        </section>
        `;
        break;
      case 'transacoes':
        html = `
        <section class="transacoes-section">
          <div class="transacoes-header">
            <h1><i class="fa fa-right-left"></i> Transações</h1>
            <button id="adicionar-transacao-btn" class="btn btn-primario"><i class="fa fa-plus"></i> Nova</button>
          </div>
          <div class="transacoes-filtros" style="display:flex;gap:1rem;align-items:center;margin-bottom:1.2rem;">
            <input type="text" id="pesquisa-transacao" placeholder="Pesquisar..." style="font-size:1rem;flex:1;padding:0.5em 1em;border-radius:0.5em;border:1.5px solid #35365a;background:#191a2b;color:#e0defa;">
            <select id="filtro-categoria" style="font-size:1rem;padding:0.5em 1em;border-radius:0.5em;border:1.5px solid #35365a;background:#191a2b;color:#e0defa;">
              <option value="">Todas as categorias</option>
              <option value="fa-cart-shopping">Compras</option>
              <option value="fa-utensils">Restaurante</option>
              <option value="fa-bus">Transporte</option>
              <option value="fa-bolt">Serviços</option>
              <option value="fa-money-bill">Outro</option>
              <option value="fa-arrow-up">Despesa</option>
              <option value="fa-arrow-down">Rendimento</option>
            </select>
          </div>
          <div style="margin-bottom:1rem;color:#bdbdf7;font-size:1.08em;">
            Total de transações: <b id="total-transacoes">0</b>
          </div>
          <div id="transacoes-lista" class="transacoes-lista">
            <!-- Transações vão aparecer aqui -->
          </div>
          <!-- Modal/Formulário para adicionar/editar transação -->
          <div id="modal-transacao" class="modal-transacao" style="display:none;">
            <div class="modal-conteudo">
              <span class="fechar-modal" id="fechar-modal-transacao">&times;</span>
              <h2 id="modal-titulo">Adicionar Transação</h2>
              <form id="form-transacao">
                <label for="transacao-nome">Nome</label>
                <input type="text" id="transacao-nome" name="nome" maxlength="100" required>
                <label for="transacao-data">Data</label>
                <input type="date" id="transacao-data" name="data" required>
                <label for="transacao-icone">Ícone</label>
                <select id="transacao-icone" name="icone" required>
                  <option value="fa-cart-shopping">Compras</option>
                  <option value="fa-utensils">Restaurante</option>
                  <option value="fa-bus">Transporte</option>
                  <option value="fa-bolt">Serviços</option>
                  <option value="fa-money-bill">Outro</option>
                  <option value="fa-arrow-up">Despesa</option>
                  <option value="fa-arrow-down">Rendimento</option>
                </select>
                <label for="transacao-preco">Preço (€)</label>
                <input type="number" id="transacao-preco" name="preco" step="0.01" min="0.01" required>
                <label for="transacao-tipo">Tipo</label>
                <select id="transacao-tipo" name="tipo" required>
                  <option value="despesa">Despesa</option>
                  <option value="rendimento">Rendimento</option>
                </select>
                <button type="submit" class="btn btn-primario" id="guardar-transacao-btn">Guardar</button>
              </form>
              <div id="transacao-erro" class="erro-transacao" style="display:none;"></div>
            </div>
          </div>
        </section>
        `;
        break;
      case 'poupancas':
        html = `<section class="poupancas-section">
          <div class="transacoes-header">
            <h1><i class="fa fa-piggy-bank"></i> Poupanças</h1>
            <button id="adicionar-poupanca-btn" class="btn btn-primario"><i class="fa fa-plus"></i> Nova</button>
          </div>
          <div class="poupancas-filtros" style="font-size:1rem;display:flex;gap:1rem;align-items:center;margin-bottom:1.2rem;">
            <input type="text" id="pesquisa-poupanca" placeholder="Pesquisar..." style="font-size:1rem;flex:1;padding:0.5em 1em;border-radius:0.5em;border:1.5px solid #35365a;background:#191a2b;color:#e0defa;">
            <select id="filtro-poupanca-categoria" style="font-size:1rem;padding:0.5em 1em;border-radius:0.5em;border:1.5px solid #35365a;background:#191a2b;color:#e0defa;">
              <option value="">Todas as categorias</option>
              <option value="fa-piggy-bank">Poupança</option>
              <option value="fa-plane">Viagem</option>
              <option value="fa-car">Carro</option>
              <option value="fa-house">Casa</option>
              <option value="fa-gift">Presente</option>
              <option value="fa-graduation-cap">Educação</option>
              <option value="fa-heart">Saúde</option>
              <option value="fa-laptop">Tecnologia</option>
              <option value="fa-money-bill">Outro</option>
            </select>
          </div>
          <div id="poupancas-lista" class="poupancas-lista"></div>
          <!-- Modal para criar/editar poupanca -->
          <div id="modal-poupanca" class="modal-transacao" style="display:none;">
            <div class="modal-conteudo">
              <span class="fechar-modal" id="fechar-modal-poupanca">&times;</span>
              <h2 id="modal-poupanca-titulo">Nova Poupança</h2>
              <form id="form-poupanca">
                <label for="poupanca-nome">Nome</label>
                <input type="text" id="poupanca-nome" name="nome" maxlength="100" required>
                <label for="poupanca-descricao">Descrição</label>
                <input type="text" id="poupanca-descricao" name="descricao" maxlength="200" required>
                <label for="poupanca-icone">Ícone</label>
                <select id="poupanca-icone" name="icone" required>
                  <option value="fa-piggy-bank">Poupança</option>
                  <option value="fa-plane">Viagem</option>
                  <option value="fa-car">Carro</option>
                  <option value="fa-house">Casa</option>
                  <option value="fa-gift">Presente</option>
                  <option value="fa-graduation-cap">Educação</option>
                  <option value="fa-heart">Saúde</option>
                  <option value="fa-laptop">Tecnologia</option>
                  <option value="fa-money-bill">Outro</option>
                </select>
                <label for="poupanca-valorMeta">Valor da Meta (€)</label>
                <input type="number" id="poupanca-valorMeta" name="valorMeta" step="0.01" min="0.01" required>
                <label for="poupanca-dataLimite">Data Limite</label>
                <input type="date" id="poupanca-dataLimite" name="dataLimite" required>
                <button type="submit" class="btn btn-primario" id="guardar-poupanca-btn">Guardar</button>
              </form>
              <div id="poupanca-erro" class="erro-transacao" style="display:none;"></div>
            </div>
          </div>
          <!-- Modal para adicionar dinheiro -->
          <div id="modal-add-money" class="modal-transacao" style="display:none;">
            <div class="modal-conteudo">
              <span class="fechar-modal" id="fechar-modal-add-money">&times;</span>
              <h2>Adicionar Dinheiro</h2>
              <form id="form-add-money">
                <label for="add-money-valor">Valor a adicionar (€)</label>
                <input type="number" id="add-money-valor" name="valor" step="0.01" min="0.01" required>
                <button type="submit" class="btn btn-primario">Adicionar</button>
              </form>
              <div id="add-money-erro" class="erro-transacao" style="display:none;"></div>
            </div>
          </div>
        </section>`;
        break;
      case 'automaticas':
        html = `
        <section class="automaticas-section">
          <div class="transacoes-header">
            <h1><i class="fa fa-repeat"></i> Transações Automáticas</h1>
            <button id="adicionar-auto-btn" class="btn btn-primario"><i class="fa fa-plus"></i> Nova</button>
          </div>
          <div class="automaticas-filtros" style="display:flex;gap:1rem;align-items:center;margin-bottom:1.2rem;">
            <input type="text" id="pesquisa-auto" placeholder="Pesquisar..." style="font-size:1rem;flex:1;padding:0.5em 1em;border-radius:0.5em;border:1.5px solid #35365a;background:#191a2b;color:#e0defa;">
            <select id="filtro-auto-frequencia" style="font-size:1rem;padding:0.5em 1em;border-radius:0.5em;border:1.5px solid #35365a;background:#191a2b;color:#e0defa;">
              <option value="">Todas as frequências</option>
              <option value="diario">Diariamente</option>
              <option value="semanal">Semanalmente</option>
              <option value="mensal">Mensalmente</option>
              <option value="anual">Anualmente</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div id="automaticas-lista" class="automaticas-lista"></div>
          <!-- Modal para adicionar/editar transação automática -->
          <div id="modal-auto" class="modal-transacao" style="display:none;">
            <div class="modal-conteudo">
              <span class="fechar-modal" id="fechar-modal-auto">&times;</span>
              <h2 id="modal-auto-titulo">Nova Transação Automática</h2>
              <form id="form-auto">
                <label for="auto-nome">Nome</label>
                <input type="text" id="auto-nome" name="nome" maxlength="100" required>
                <label for="auto-icone">Ícone</label>
                <select id="auto-icone" name="icone" required>
                  <option value="fa-cart-shopping">Compras</option>
                  <option value="fa-utensils">Restaurante</option>
                  <option value="fa-bus">Transporte</option>
                  <option value="fa-bolt">Serviços</option>
                  <option value="fa-money-bill">Outro</option>
                  <option value="fa-arrow-up">Despesa</option>
                  <option value="fa-arrow-down">Rendimento</option>
                </select>
                <label for="auto-preco">Preço (€)</label>
                <input type="number" id="auto-preco" name="preco" step="0.01" min="0.01" required>
                <label for="auto-tipo">Tipo</label>
                <select id="auto-tipo" name="tipo" required>
                  <option value="despesa">Despesa</option>
                  <option value="rendimento">Rendimento</option>
                </select>
                <label for="auto-frequencia">Frequência</label>
                <select id="auto-frequencia" name="frequencia" required>
                  <option value="diario">Diariamente</option>
                  <option value="semanal">Semanalmente</option>
                  <option value="mensal">Mensalmente</option>
                  <option value="anual">Anualmente</option>
                  <option value="custom">Custom</option>
                </select>
                <div id="auto-custom-div" style="display:none;">
                  <label for="auto-custom-minutos">Intervalo custom (minutos)</label>
                  <input type="number" id="auto-custom-minutos" name="customMinutos" min="1" step="1">
                </div>
                <button type="submit" class="btn btn-primario" id="guardar-auto-btn">Guardar</button>
              </form>
              <div id="auto-erro" class="erro-transacao" style="display:none;"></div>
            </div>
          </div>
        </section>
        `;
        break;
    }
    main.innerHTML = html;

    // --- INICIO PAGE LOGIC ---
    if (section === 'inicio') {
      const token = localStorage.getItem('token');
      let transacoesCache = [];
      let periodoSelecionado = 'este-mes';

      // Função para obter range de datas para cada filtro
      function getPeriodoRange(periodo) {
        const now = new Date();
        let inicio, fim;
        switch (periodo) {
          case 'hoje':
            inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            fim = new Date(inicio); fim.setDate(fim.getDate() + 1);
            break;
          case 'ontem':
            inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'esta-semana': {
            const diaSemana = now.getDay() || 7;
            inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diaSemana + 1);
            fim = new Date(inicio); fim.setDate(fim.getDate() + 7);
            break;
          }
          case 'semana-passada': {
            const diaSemana = now.getDay() || 7;
            fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diaSemana + 1);
            inicio = new Date(fim); inicio.setDate(inicio.getDate() - 7);
            break;
          }
          case 'este-mes':
            inicio = new Date(now.getFullYear(), now.getMonth(), 1);
            fim = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
          case 'mes-passado':
            inicio = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            fim = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'este-ano':
            inicio = new Date(now.getFullYear(), 0, 1);
            fim = new Date(now.getFullYear() + 1, 0, 1);
            break;
          case 'ano-passado':
            inicio = new Date(now.getFullYear() - 1, 0, 1);
            fim = new Date(now.getFullYear(), 0, 1);
            break;
          case 'tudo':
          default:
            inicio = null; fim = null;
        }
        return { inicio, fim };
      }

      // Função para filtrar transações pelo período selecionado
      function filtrarTransacoesPeriodo(transacoes, periodo) {
        const { inicio, fim } = getPeriodoRange(periodo);
        if (!inicio || !fim) return transacoes;
        return transacoes.filter(t => {
          const d = new Date(t.data);
          return d >= inicio && d < fim;
        });
      }

      // Função para atualizar todos os gráficos e resumo
      function atualizarDashboard(transacoes, periodo) {
        // Resumo
        atualizarResumo(transacoes);

        // Pie Chart: despesas por categoria
        const despesasPeriodo = transacoes.filter(t => t.tipo === 'despesa');
        const categorias = {};
        despesasPeriodo.forEach(t => {
          categorias[t.icone] = (categorias[t.icone] || 0) + Number(t.preco);
        });
        const categoriaLabels = Object.keys(categorias).map(ic => {
          switch(ic) {
            case 'fa-cart-shopping': return 'Compras';
            case 'fa-utensils': return 'Restaurante';
            case 'fa-bus': return 'Transporte';
            case 'fa-bolt': return 'Serviços';
            case 'fa-money-bill': return 'Outro';
            default: return ic;
          }
        });
        const categoriaValores = Object.values(categorias);

        if (window.graficoDespesasCategorias) window.graficoDespesasCategorias.destroy();
        const ctxPie = document.getElementById('grafico-despesas-categorias').getContext('2d');
        window.graficoDespesasCategorias = new Chart(ctxPie, {
          type: 'pie',
          data: {
            labels: categoriaLabels,
            datasets: [{
              data: categoriaValores,
              backgroundColor: [
                '#6c5cd2', '#e05a6c', '#ffe066', '#3fd1a0', '#b2b2c6', '#8a7be6', '#4bffb3', '#ffb347'
              ],
              borderWidth: 2,
              borderColor: '#23233a'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1,
            plugins: {
              legend: { labels: { color: '#e3e3f1', font: { size: 15 } } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    return `${label}: €${value.toFixed(2)}`;
                  }
                }
              }
            }
          }
        });

        // Line Chart: evolução do saldo (no período)
        // Agrupar por dia
        const transOrd = [...transacoes].sort((a, b) => new Date(a.data) - new Date(b.data));
        const dias = {};
        let saldoAcum = 0;
        transOrd.forEach(t => {
          const dia = new Date(t.data);
          dia.setHours(0,0,0,0);
          const key = dia.toISOString().slice(0,10);
          if (!dias[key]) dias[key] = saldoAcum;
          if (t.tipo === 'rendimento') saldoAcum += Number(t.preco);
          else if (t.tipo === 'despesa') saldoAcum -= Number(t.preco);
          dias[key] = saldoAcum;
        });
        const labels = Object.keys(dias).sort();
        const dataSaldo = labels.map(key => dias[key]);
        const labelsFormat = labels.map(key => {
          const d = new Date(key);
          return d.toLocaleDateString('pt-PT');
        });

        if (window.graficoEvolucaoSaldo) window.graficoEvolucaoSaldo.destroy();
        const ctxLine = document.getElementById('grafico-evolucao-saldo').getContext('2d');
        window.graficoEvolucaoSaldo = new Chart(ctxLine, {
          type: 'line',
          data: {
            labels: labelsFormat,
            datasets: [{
              label: 'Saldo',
              data: dataSaldo,
              borderColor: '#6c5cd2',
              backgroundColor: 'rgba(108,92,210,0.10)',
              fill: true,
              tension: 0.3,
              pointRadius: 4,
              pointHoverRadius: 7,
              pointBackgroundColor: '#6c5cd2'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1.5,
            plugins: {
              legend: { labels: { color: '#e3e3f1', font: { size: 15 } } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `Saldo: €${context.parsed.y.toFixed(2)}`;
                  }
                }
              }
            },
            scales: {
              x: { ticks: { color: '#e3e3f1', font: { size: 13 } }, grid: { color: '#23233a' } },
              y: { ticks: { color: '#e3e3f1', font: { size: 13 } }, grid: { color: '#23233a' } }
            }
          }
        });

        // Bar Chart: receitas vs despesas (no período)
        let receitasPeriodo = 0, despesasPeriodoValor = 0;
        transacoes.forEach(t => {
          if (t.tipo === 'rendimento') receitasPeriodo += Number(t.preco);
          if (t.tipo === 'despesa') despesasPeriodoValor += Number(t.preco);
        });

        if (window.graficoReceitasDespesas) window.graficoReceitasDespesas.destroy();
        const ctxBar = document.getElementById('grafico-receitas-despesas').getContext('2d');
        window.graficoReceitasDespesas = new Chart(ctxBar, {
          type: 'bar',
          data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
              label: 'Valor (€)',
              data: [receitasPeriodo, despesasPeriodoValor],
              backgroundColor: ['#3fd1a0', '#e05a6c'],
              borderWidth: 2,
              borderColor: '#23233a'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.label}: €${context.parsed.y.toFixed(2)}`;
                  }
                }
              }
            },
            scales: {
              x: { ticks: { color: '#e3e3f1', font: { size: 13 } }, grid: { color: '#23233a' } },
              y: { ticks: { color: '#e3e3f1', font: { size: 13 } }, grid: { color: '#23233a' } }
            }
          }
        });
      }

      // Carregar transações e inicializar dashboard
      fetch('http://localhost:3000/api/transacoes', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
        .then(res => res.ok ? res.json() : [])
        .then(transacoes => {
          transacoesCache = transacoes || [];
          document.getElementById('total-transacoes').textContent = transacoesCache.length;
          // Inicializa com o período default
          const periodoSelect = document.getElementById('dashboard-periodo');
          periodoSelecionado = periodoSelect ? periodoSelect.value : 'este-mes';
          const transacoesFiltradas = filtrarTransacoesPeriodo(transacoesCache, periodoSelecionado);
          atualizarDashboard(transacoesFiltradas, periodoSelecionado);

          // Atualiza resumo para todas as transações (não só filtradas)
          atualizarResumo(transacoesCache);

          // Handler para mudar o filtro de período
          if (periodoSelect) {
            periodoSelect.addEventListener('change', function() {
              periodoSelecionado = periodoSelect.value;
              const filtradas = filtrarTransacoesPeriodo(transacoesCache, periodoSelecionado);
              atualizarDashboard(filtradas, periodoSelecionado);
            });
          }
        })
        .catch(() => {
          atualizarResumo([]);
          document.getElementById('total-transacoes').textContent = '0';
        });
    }

    // --- Lógica para o modal de transações e integração com a base de dados ---
    if (section === 'transacoes') {
      const btnAbrir = document.getElementById('adicionar-transacao-btn');
      const modal = document.getElementById('modal-transacao');
      const btnFechar = document.getElementById('fechar-modal-transacao');
      const form = document.getElementById('form-transacao');
      const lista = document.getElementById('transacoes-lista');
      const erroDiv = document.getElementById('transacao-erro');
      const token = localStorage.getItem('token');
      let isEditMode = false;
      let editingId = null;

      function fecharModal() {
        modal.style.display = 'none';
        form.reset();
        erroDiv.style.display = 'none';
        erroDiv.textContent = '';
        isEditMode = false;
        editingId = null;
        document.getElementById('modal-titulo').textContent = 'Adicionar Transação';
      }

      // Variável para armazenar transações originais (não filtradas)
      let transacoesOriginais = [];

      // Função para renderizar as transações como cartões
      function renderTransacoes(transacoes) {
        if (!transacoes.length) {
          lista.innerHTML = '<p class="vazio">Ainda não tem transações.</p>';
          document.getElementById('total-transacoes').textContent = '0';
          return;
        }
        lista.innerHTML = transacoes.map(tran => {
          // Corrigir id para string simples
          let id = typeof tran._id === 'object' && tran._id.$oid ? tran._id.$oid : tran._id;
          id = typeof id === 'string' ? id : String(id);
          // Só renderiza actions se o id for ObjectId válido
          const isValidId = /^[a-fA-F0-9]{24}$/.test(id);
          return `
          <div class="transacao-card ${tran.tipo}" data-id="${isValidId ? id : ''}">
            <div class="transacao-icone"><i class="fa ${tran.icone}"></i></div>
            <div class="transacao-info">
              <div class="transacao-nome">${sanitizeHTML(tran.nome)}</div>
              <div class="transacao-data">${new Date(tran.data).toLocaleDateString('pt-PT')}</div>
            </div>
            <div class="transacao-preco ${tran.tipo}">${tran.tipo === 'despesa' ? '-' : '+'}€${Number(tran.preco).toFixed(2)}</div>
            <div class="transacao-actions" style="display:flex;gap:0.5em;align-items:center;">
              ${isValidId ? `<button class="icon-btn btn-editar" title="Editar" style="background:transparent;border:none;color:#8f7df7;"><i class="fa fa-pen"></i></button>
              <button class="icon-btn btn-apagar" title="Apagar" style="background:transparent;border:none;color:#ff4b4b;"><i class="fa fa-trash"></i></button>` : `<span style='color:#ff4b4b;font-size:0.95em;'>ID inválido</span>`}
            </div>
          </div>
          `;
        }).join('');
        document.getElementById('total-transacoes').textContent = transacoes.length;
        // Adicionar listeners aos botões de ação
        document.querySelectorAll('.btn-apagar').forEach(btn => {
          btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const card = btn.closest('.transacao-card');
            const id = card.getAttribute('data-id');
            if (!id) {
              alert('ID da transação não encontrado ou inválido.');
              return;
            }
            if (confirm('Tem a certeza que quer apagar esta transação?')) {
              btn.disabled = true;
              try {
                const res = await fetch(`http://localhost:3000/api/transacoes/${id}` , {
                  method: 'DELETE',
                  headers: { 'Authorization': 'Bearer ' + token }
                });
                if (res.status === 404) {
                  alert('Transação não encontrada (404). Ela pode já ter sido removida.');
                } else if (!res.ok) {
                  throw new Error('Erro ao apagar transação');
                } else {
                  fetchTransacoes();
                }
              } catch (err) {
                alert('Erro ao apagar transação: ' + (err.message || err));
              } finally {
                btn.disabled = false;
              }
            }
          });
        });
        document.querySelectorAll('.btn-editar').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = btn.closest('.transacao-card');
            const id = card.getAttribute('data-id');
            if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
              erroDiv.textContent = 'ID inválido. Não é possível editar esta transação.';
              erroDiv.style.display = 'block';
              return;
            }
            const tran = transacoesOriginais.find(t => {
              let tid = t._id;
              if (typeof tid === 'object' && tid.$oid) tid = tid.$oid;
              return String(tid) === String(id);
            });
            if (!tran) {
              erroDiv.textContent = 'Transação não encontrada.';
              erroDiv.style.display = 'block';
              return;
            }
            isEditMode = true;
            editingId = id;
            form['nome'].value = tran.nome;
            form['data'].value = tran.data.split('T')[0];
            form['icone'].value = tran.icone;
            form['preco'].value = tran.preco;
            form['tipo'].value = tran.tipo;
            document.getElementById('modal-titulo').textContent = 'Editar Transação';
            modal.style.display = 'flex';
          });
        });
      }

      // Função para evitar XSS
      function sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Função para filtrar transações por pesquisa e categoria
      function filtrarTransacoes() {
        const termo = (document.getElementById('pesquisa-transacao').value || '').toLowerCase();
        const categoria = document.getElementById('filtro-categoria').value;
        let filtradas = transacoesOriginais;
        if (termo) {
          filtradas = filtradas.filter(t =>
            (t.nome && t.nome.toLowerCase().includes(termo)) ||
            (t.icone && t.icone.toLowerCase().includes(termo))
          );
        }
        if (categoria) {
          // Se for categoria de tipo (Despesa/Rendimento)
          if (categoria === 'fa-arrow-up') {
            filtradas = filtradas.filter(t => t.tipo === 'despesa');
          } else if (categoria === 'fa-arrow-down') {
            filtradas = filtradas.filter(t => t.tipo === 'rendimento');
          } else {
            filtradas = filtradas.filter(t => t.icone === categoria);
          }
        }
        renderTransacoes(filtradas);
      }

      // Buscar transações do utilizador
      async function fetchTransacoes() {
        try {
          const res = await fetch('http://localhost:3000/api/transacoes', {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (!res.ok) {
            // Tenta mostrar mensagem de erro do backend
            let msg = 'Erro ao buscar transações';
            try {
              const errJson = await res.json();
              if (errJson && errJson.mensagem) msg = errJson.mensagem;
            } catch {}
            lista.innerHTML = `<p class="erro">${msg}</p>`;
            console.error('Erro HTTP:', res.status, msg);
            return;
          }
          const data = await res.json();
          transacoesOriginais = data;
          renderTransacoes(data);
          atualizarResumo(data);
          
          // Attach event listeners for filters AFTER data is loaded
          const pesquisaInput = document.getElementById('pesquisa-transacao');
          const categoriaSelect = document.getElementById('filtro-categoria');
          if (pesquisaInput) {
            pesquisaInput.addEventListener('input', filtrarTransacoes);
          }
          if (categoriaSelect) {
            categoriaSelect.addEventListener('change', filtrarTransacoes);
          }
        } catch (err) {
          lista.innerHTML = `<p class="erro">Erro ao carregar transações: ${err.message}</p>`;
          console.error('Erro JS:', err);
        }
      }

      // Validação simples
      function validarTransacao(tran) {
        if (!tran.nome || !tran.data || !tran.icone || !tran.preco || !tran.tipo) {
          throw new Error('Todos os campos são obrigatórios.');
        }
        if (tran.nome.length > 100) {
          throw new Error('O nome é demasiado longo.');
        }
        if (isNaN(tran.preco) || Number(tran.preco) <= 0) {
          throw new Error('Preço inválido.');
        }
        return tran;
      }

      // SINGLE form submit handler for both add and edit
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        erroDiv.style.display = 'none';
        erroDiv.textContent = '';
        const nova = {
          nome: form['nome'].value.trim(),
          data: form['data'].value,
          icone: form['icone'].value,
          preco: form['preco'].value,
          tipo: form['tipo'].value
        };
        try {
          validarTransacao(nova);
          let res;
          if (isEditMode && editingId) {
            res = await fetch(`http://localhost:3000/api/transacoes/${editingId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify(nova)
            });
          } else {
            res = await fetch('http://localhost:3000/api/transacoes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify(nova)
            });
          }
          if (!res.ok) {
            let msg = isEditMode ? 'Erro ao editar transação' : 'Erro ao guardar transação';
            try {
              const errJson = await res.json();
              if (errJson && errJson.mensagem) msg = errJson.mensagem;
            } catch {}
            throw new Error(msg);
          }
          fecharModal();
          fetchTransacoes();
        } catch (err) {
          erroDiv.textContent = err.message;
          erroDiv.style.display = 'block';
        }
      });

      // Modal abrir/fechar
      if (btnAbrir && modal) {
        btnAbrir.addEventListener('click', function() {
          isEditMode = false;
          editingId = null;
          document.getElementById('modal-titulo').textContent = 'Adicionar Transação';
          modal.style.display = 'flex';
          // Preencher data com hoje
          const hoje = new Date();
          const yyyy = hoje.getFullYear();
          const mm = String(hoje.getMonth() + 1).padStart(2, '0');
          const dd = String(hoje.getDate()).padStart(2, '0');
          form['data'].value = `${yyyy}-${mm}-${dd}`;
        });
      }
      if (btnFechar && modal) {
        btnFechar.addEventListener('click', fecharModal);
      }
      if (modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal) fecharModal();
        });
      }

      // --- ADD THIS LINE TO LOAD TRANSACTIONS WHEN SECTION IS RENDERED ---
      fetchTransacoes();
    }

    // --- Lógica para poupancas ---
    if (section === 'poupancas') {
      const btnAbrir = document.getElementById('adicionar-poupanca-btn');
      const modal = document.getElementById('modal-poupanca');
      const btnFechar = document.getElementById('fechar-modal-poupanca');
      const form = document.getElementById('form-poupanca');
      const lista = document.getElementById('poupancas-lista');
      const erroDiv = document.getElementById('poupanca-erro');
      const token = localStorage.getItem('token');
      const modalAdd = document.getElementById('modal-add-money');
      const btnFecharAdd = document.getElementById('fechar-modal-add-money');
      const formAdd = document.getElementById('form-add-money');
      const erroAdd = document.getElementById('add-money-erro');
      let poupancaIdParaAdd = null;
      let isEditMode = false;
      let editingId = null;

      function fecharModal() {
        modal.style.display = 'none';
        form.reset();
        erroDiv.style.display = 'none';
        erroDiv.textContent = '';
        isEditMode = false;
        editingId = null;
        document.getElementById('modal-poupanca-titulo').textContent = 'Nova Poupança';
      }

      function fecharModalAdd() {
        modalAdd.style.display = 'none';
        formAdd.reset();
        erroAdd.style.display = 'none';
        erroAdd.textContent = '';
        poupancaIdParaAdd = null;
      }

      // Adiciona filtros de pesquisa e categoria
      const filtrosHtml = `
      `;
      lista.insertAdjacentHTML('beforebegin', filtrosHtml);

      let poupancasOriginais = [];

      function renderPoupancas(poupancas) {
        if (!poupancas.length) {
          lista.innerHTML = '<p class="vazio">Ainda não tem poupanças.</p>';
          return;
        }
        lista.innerHTML = poupancas.map(pou => {
          let id = typeof pou._id === 'object' && pou._id.$oid ? pou._id.$oid : pou._id;
          id = typeof id === 'string' ? id : String(id);
          const isValidId = /^[a-fA-F0-9]{24}$/.test(id);
          const percent = Math.min(100, Math.round(((pou.valorAtual || 0) / pou.valorMeta) * 100));
          const concluida = pou.concluida;
          const podeConcluir = !concluida && (pou.valorAtual || 0) >= pou.valorMeta;
          const corBarra = concluida ? '#4bffb3' : '#6d5cd2';
          const corBorda = concluida ? '#4bffb3' : '#6d5cd2';
          return `
          <div class="poupanca-card" data-id="${isValidId ? id : ''}" style="border-left-color:${corBorda};">
            <div class="poupanca-icone"><i class="fa ${pou.icone}"></i></div>
            <div class="poupanca-info">
              <div class="poupanca-nome">${sanitizeHTML(pou.nome)}</div>
              <div class="poupanca-desc">${sanitizeHTML(pou.descricao)}</div>
              <div class="poupanca-meta">Meta: €${Number(pou.valorMeta).toFixed(2)}</div>
              <div class="poupanca-data">Até: ${new Date(pou.dataLimite).toLocaleDateString('pt-PT')}</div>
              <div class="progress-bar"><div style="width:${percent}%;background:${corBarra};"></div></div>
              <div class="poupanca-progress-label">
                Guardado: <b>€${Number(pou.valorAtual || 0).toFixed(2)}</b> (${percent}%)
              </div>
            </div>
            <div class="poupanca-actions" style="display:flex;flex-direction:column;gap:0.5em;align-items:flex-end;">
              <button class="icon-btn btn-add-money" title="Adicionar dinheiro" style="background:transparent;border:none;color:#6d5dd2;"><i class="fa fa-plus"></i></button>
              <button class="icon-btn btn-editar" title="Editar" style="background:transparent;border:none;color:#8f7df7;"><i class="fa fa-pen"></i></button>
              <button class="icon-btn btn-apagar" title="Apagar" style="background:transparent;border:none;color:#ff4b4b;"><i class="fa fa-trash"></i></button>
              ${podeConcluir ? `<button class="icon-btn btn-concluir" title="Concluir" style="background:transparent;border:none;color:#4bffb3;"><i class="fa fa-check"></i></button>` : ''}
              ${concluida ? `<span style="color:#4bffb3;font-size:0.98em;font-weight:600;">Concluída</span>` : ''}
            </div>
          </div>
          `;
        }).join('');

        document.querySelectorAll('.btn-add-money').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = btn.closest('.poupanca-card');
            poupancaIdParaAdd = card.getAttribute('data-id');
            modalAdd.style.display = 'flex';
          });
        });

        document.querySelectorAll('.btn-apagar').forEach(btn => {
          btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const card = btn.closest('.poupanca-card');
            const id = card.getAttribute('data-id');
            if (!id) {
              alert('ID da poupança não encontrado ou inválido.');
              return;
            }
            if (confirm('Tem a certeza que quer apagar esta poupança?')) {
              btn.disabled = true;
              try {
                const res = await fetch(`http://localhost:3000/api/poupancas/${id}` , {
                  method: 'DELETE',
                  headers: { 'Authorization': 'Bearer ' + token }
                });
                if (res.status === 404) {
                  alert('Poupança não encontrada (404). Ela pode já ter sido removida.');
                } else if (!res.ok) {
                  throw new Error('Erro ao apagar poupança');
                } else {
                  fetchPoupancas();
                }
              } catch (err) {
                alert('Erro ao apagar poupança: ' + (err.message || err));
              } finally {
                btn.disabled = false;
              }
            }
          });
        });

        document.querySelectorAll('.btn-editar').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = btn.closest('.poupanca-card');
            const id = card.getAttribute('data-id');
            if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
              erroDiv.textContent = 'ID inválido. Não é possível editar esta poupança.';
              erroDiv.style.display = 'block';
              return;
            }
            const pou = poupancasOriginais.find(p => {
              let pid = p._id;
              if (typeof pid === 'object' && pid.$oid) pid = pid.$oid;
              return String(pid) === String(id);
            });
            if (!pou) {
              erroDiv.textContent = 'Poupança não encontrada.';
              erroDiv.style.display = 'block';
              return;
            }
            isEditMode = true;
            editingId = id;
            form['nome'].value = pou.nome;
            form['descricao'].value = pou.descricao;
            form['icone'].value = pou.icone;
            form['valorMeta'].value = pou.valorMeta;
            form['dataLimite'].value = pou.dataLimite.split('T')[0];
            document.getElementById('modal-poupanca-titulo').textContent = 'Editar Poupança';
            modal.style.display = 'flex';
          });
        });

        document.querySelectorAll('.btn-concluir').forEach(btn => {
          btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const card = btn.closest('.poupanca-card');
            const id = card.getAttribute('data-id');
            if (!id) return;
            if (!confirm('Concluir esta poupança?')) return;
            btn.disabled = true;
            try {
              const res = await fetch(`http://localhost:3000/api/poupancas/${id}/concluir`, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token }
              });
              if (!res.ok) throw new Error('Erro ao concluir poupança');
              fetchPoupancas();
            } catch (err) {
              alert('Erro ao concluir poupança: ' + (err.message || err));
            } finally {
              btn.disabled = false;
            }
          });
        });
      }

      function sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      async function fetchPoupancas() {
        try {
          const res = await fetch('http://localhost:3000/api/poupancas', {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (!res.ok) {
            let msg = 'Erro ao buscar poupanças';
            try {
              const errJson = await res.json();
              if (errJson && errJson.mensagem) msg = errJson.mensagem;
            } catch {}
            lista.innerHTML = `<p class="erro">${msg}</p>`;
            console.error('Erro HTTP:', res.status, msg);
            return;
          }
          const data = await res.json();
          poupancasOriginais = data;
          renderPoupancas(data);

          // Attach filtros
          const pesquisaInput = document.getElementById('pesquisa-poupanca');
          const categoriaSelect = document.getElementById('filtro-poupanca-categoria');
          if (pesquisaInput) {
            pesquisaInput.addEventListener('input', filtrarPoupancas);
          }
          if (categoriaSelect) {
            categoriaSelect.addEventListener('change', filtrarPoupancas);
          }
        } catch (err) {
          lista.innerHTML = `<p class="erro">Erro ao carregar poupanças: ${err.message}</p>`;
          console.error('Erro JS:', err);
        }
      }

      function validarPoupanca(pou) {
        if (!pou.nome || !pou.descricao || !pou.icone || !pou.valorMeta || !pou.dataLimite) {
          throw new Error('Todos os campos são obrigatórios.');
        }
        if (pou.nome.length > 100) {
          throw new Error('O nome é demasiado longo.');
        }
        if (isNaN(pou.valorMeta) || Number(pou.valorMeta) <= 0) {
          throw new Error('Valor da meta inválido.');
        }
        return pou;
      }

      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        erroDiv.style.display = 'none';
        erroDiv.textContent = '';
        const formData = {
          nome: form['nome'].value.trim(),
          descricao: form['descricao'].value.trim(),
          icone: form['icone'].value,
          valorMeta: form['valorMeta'].value,
          dataLimite: form['dataLimite'].value
        };
        try {
          validarPoupanca(formData);
          let res;
          if (isEditMode && editingId) {
            res = await fetch(`http://localhost:3000/api/poupancas/${editingId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify(formData)
            });
          } else {
            res = await fetch('http://localhost:3000/api/poupancas', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify(formData)
            });
          }
          if (!res.ok) {
            let msg = isEditMode ? 'Erro ao editar poupança' : 'Erro ao guardar poupança';
            try {
              const errJson = await res.json();
              if (errJson && errJson.mensagem) msg = errJson.mensagem;
            } catch {}
            throw new Error(msg);
          }
          fecharModal();
          fetchPoupancas();
        } catch (err) {
          erroDiv.textContent = err.message;
          erroDiv.style.display = 'block';
        }
      });

      // Modal abrir/fechar
      if (btnAbrir && modal) {
        btnAbrir.addEventListener('click', function() {
          isEditMode = false;
          editingId = null;
          document.getElementById('modal-poupanca-titulo').textContent = 'Nova Poupança';
          modal.style.display = 'flex';
        });
      }

      if (btnFechar && modal) {
        btnFechar.addEventListener('click', fecharModal);
      }

      if (modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal) fecharModal();
        });
      }

      if (btnFecharAdd && modalAdd) {
        btnFecharAdd.addEventListener('click', fecharModalAdd);
      }

      if (modalAdd) {
        modalAdd.addEventListener('click', function(e) {
          if (e.target === modalAdd) fecharModalAdd();
        });
      }

      if (formAdd) {
        formAdd.addEventListener('submit', async function(e) {
          e.preventDefault();
          erroAdd.style.display = 'none';
          erroAdd.textContent = '';
          const valor = formAdd['valor'].value;
          if (!valor || isNaN(valor) || Number(valor) <= 0) {
            erroAdd.textContent = 'Valor inválido.';
            erroAdd.style.display = 'block';
            return;
          }
          if (!poupancaIdParaAdd) {
            erroAdd.textContent = 'Erro interno: ID não encontrado.';
            erroAdd.style.display = 'block';
            return;
          }
          try {
            const res = await fetch(`http://localhost:3000/api/poupancas/${poupancaIdParaAdd}/add`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({ valor })
            });
            if (!res.ok) {
              let msg = 'Erro ao adicionar valor.';
              try {
                const errJson = await res.json();
                if (errJson && errJson.mensagem) msg = errJson.mensagem;
              } catch {}
              throw new Error(msg);
            }
            fecharModalAdd();
            fetchPoupancas();
          } catch (err) {
            erroAdd.textContent = err.message;
            erroAdd.style.display = 'block';
          }
        });
      }

      // Função para filtrar poupancas por pesquisa e categoria
      function filtrarPoupancas() {
        const termo = (document.getElementById('pesquisa-poupanca').value || '').toLowerCase();
        const categoria = document.getElementById('filtro-poupanca-categoria').value;
        let filtradas = poupancasOriginais;
        if (termo) {
          filtradas = filtradas.filter(p =>
            (p.nome && p.nome.toLowerCase().includes(termo)) ||
            (p.descricao && p.descricao.toLowerCase().includes(termo))
          );
        }
        if (categoria) {
          filtradas = filtradas.filter(p => p.icone === categoria);
        }
        renderPoupancas(filtradas);
      }

      fetchPoupancas().then(() => {
        const pesquisaInput = document.getElementById('pesquisa-poupanca');
        const categoriaSelect = document.getElementById('filtro-poupanca-categoria');
        if (pesquisaInput) {
          pesquisaInput.addEventListener('input', filtrarPoupancas);
        }
        if (categoriaSelect) {
          categoriaSelect.addEventListener('change', filtrarPoupancas);
        }
      });
    }

    // --- Lógica para transações automáticas ---
    if (section === 'automaticas') {
      const btnAbrir = document.getElementById('adicionar-auto-btn');
      const modal = document.getElementById('modal-auto');
      const btnFechar = document.getElementById('fechar-modal-auto');
      const form = document.getElementById('form-auto');
      const lista = document.getElementById('automaticas-lista');
      const erroDiv = document.getElementById('auto-erro');
      const token = localStorage.getItem('token');
      let isEditMode = false;
      let editingId = null;
      let automaticasOriginais = [];

      // Mostrar/ocultar campo custom
      const freqSelect = document.getElementById('auto-frequencia');
      const customDiv = document.getElementById('auto-custom-div');
      if (freqSelect && customDiv) {
        freqSelect.addEventListener('change', function() {
          customDiv.style.display = freqSelect.value === 'custom' ? 'block' : 'none';
        });
      }

      function fecharModal() {
        modal.style.display = 'none';
        form.reset();
        erroDiv.style.display = 'none';
        erroDiv.textContent = '';
        isEditMode = false;
        editingId = null;
        document.getElementById('modal-auto-titulo').textContent = 'Nova Transação Automática';
        if (customDiv) customDiv.style.display = 'none';
      }

      // Render lista
      function renderAutomaticas(automaticas) {
        if (!automaticas.length) {
          lista.innerHTML = '<p class="vazio">Ainda não tem transações automáticas.</p>';
          return;
        }
        lista.innerHTML = automaticas.map(auto => {
          let id = typeof auto._id === 'object' && auto._id.$oid ? auto._id.$oid : auto._id;
          id = typeof id === 'string' ? id : String(id);
          const freqLabel = {
            'diario': 'Diariamente',
            'semanal': 'Semanalmente',
            'mensal': 'Mensalmente',
            'anual': 'Anualmente',
            'custom': `Cada ${auto.customMinutos || '?'} min`
          }[auto.frequencia] || auto.frequencia;
          return `
          <div class="transacao-card ${auto.tipo}" data-id="${id}">
            <div class="transacao-icone"><i class="fa ${auto.icone}"></i></div>
            <div class="transacao-info">
              <div class="transacao-nome">${sanitizeHTML(auto.nome)}</div>
              <div class="transacao-data">${freqLabel}</div>
              <div style="font-size:0.97em;color:#bdbdf7;">Executada <b>${auto.execucoes || 0}</b>x</div>
            </div>
            <div class="transacao-preco ${auto.tipo}">${auto.tipo === 'despesa' ? '-' : '+'}€${Number(auto.preco).toFixed(2)}</div>
            <div class="transacao-actions" style="display:flex;gap:0.5em;align-items:center;">
              <button class="icon-btn btn-editar" title="Editar" style="background:transparent;border:none;color:#8f7df7;"><i class="fa fa-pen"></i></button>
              <button class="icon-btn btn-apagar" title="Apagar" style="background:transparent;border:none;color:#ff4b4b;"><i class="fa fa-trash"></i></button>
            </div>
          </div>
          `;
        }).join('');
        // Listeners editar/apagar
        document.querySelectorAll('.btn-apagar').forEach(btn => {
          btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const card = btn.closest('.transacao-card');
            const id = card.getAttribute('data-id');
            if (!id) return;
            if (confirm('Tem a certeza que quer apagar esta transação automática?')) {
              btn.disabled = true;
              try {
                const res = await fetch(`http://localhost:3000/api/automaticas/${id}` , {
                  method: 'DELETE',
                  headers: { 'Authorization': 'Bearer ' + token }
                });
                if (!res.ok) throw new Error('Erro ao apagar transação automática');
                fetchAutomaticas();
              } catch (err) {
                alert('Erro ao apagar: ' + (err.message || err));
              } finally {
                btn.disabled = false;
              }
            }
          });
        });
        document.querySelectorAll('.btn-editar').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = btn.closest('.transacao-card');
            const id = card.getAttribute('data-id');
            const auto = automaticasOriginais.find(a => String(a._id) === String(id));
            if (!auto) return;
            isEditMode = true;
            editingId = id;
            form['nome'].value = auto.nome;
            form['icone'].value = auto.icone;
            form['preco'].value = auto.preco;
            form['tipo'].value = auto.tipo;
            form['frequencia'].value = auto.frequencia;
            if (auto.frequencia === 'custom' && form['customMinutos']) {
              form['customMinutos'].value = auto.customMinutos || '';
              customDiv.style.display = 'block';
            } else if (customDiv) {
              customDiv.style.display = 'none';
            }
            document.getElementById('modal-auto-titulo').textContent = 'Editar Transação Automática';
            modal.style.display = 'flex';
          });
        });
      }

      function sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Filtros
      function filtrarAutomaticas() {
        const termo = (document.getElementById('pesquisa-auto').value || '').toLowerCase();
        const freq = document.getElementById('filtro-auto-frequencia').value;
        let filtradas = automaticasOriginais;
        if (termo) {
          filtradas = filtradas.filter(a =>
            (a.nome && a.nome.toLowerCase().includes(termo)) ||
            (a.icone && a.icone.toLowerCase().includes(termo))
          );
        }
        if (freq) {
          filtradas = filtradas.filter(a => a.frequencia === freq);
        }
        renderAutomaticas(filtradas);
      }

      // Buscar automaticas
      async function fetchAutomaticas() {
        try {
          const res = await fetch('http://localhost:3000/api/automaticas', {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (!res.ok) {
            lista.innerHTML = `<p class="erro">Erro ao buscar transações automáticas</p>`;
            return;
          }
          const data = await res.json();
          automaticasOriginais = data;
          renderAutomaticas(data);
          // Attach filtros
          const pesquisaInput = document.getElementById('pesquisa-auto');
          const freqSelect = document.getElementById('filtro-auto-frequencia');
          if (pesquisaInput) pesquisaInput.addEventListener('input', filtrarAutomaticas);
          if (freqSelect) freqSelect.addEventListener('change', filtrarAutomaticas);
        } catch (err) {
          lista.innerHTML = `<p class="erro">Erro ao carregar transações automáticas: ${err.message}</p>`;
        }
      }

      // Validação
      function validarAuto(auto) {
        if (!auto.nome || !auto.icone || !auto.preco || !auto.tipo || !auto.frequencia) {
          throw new Error('Todos os campos são obrigatórios.');
        }
        if (auto.nome.length > 100) throw new Error('O nome é demasiado longo.');
        if (isNaN(auto.preco) || Number(auto.preco) <= 0) throw new Error('Preço inválido.');
        if (auto.frequencia === 'custom' && (!auto.customMinutos || isNaN(auto.customMinutos) || Number(auto.customMinutos) < 1)) {
          throw new Error('Intervalo custom inválido.');
        }
        return auto;
      }

      // Submit
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        erroDiv.style.display = 'none';
        erroDiv.textContent = '';
        const nova = {
          nome: form['nome'].value.trim(),
          icone: form['icone'].value,
          preco: form['preco'].value,
          tipo: form['tipo'].value,
          frequencia: form['frequencia'].value,
          customMinutos: form['frequencia'].value === 'custom' ? Number(form['customMinutos'].value) : undefined
        };
        try {
          validarAuto(nova);
          let res;
          if (isEditMode && editingId) {
            res = await fetch(`http://localhost:3000/api/automaticas/${editingId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify(nova)
            });
          } else {
            res = await fetch('http://localhost:3000/api/automaticas', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify(nova)
            });
          }
          if (!res.ok) {
            let msg = isEditMode ? 'Erro ao editar transação automática' : 'Erro ao guardar transação automática';
            try {
              const errJson = await res.json();
              if (errJson && errJson.mensagem) msg = errJson.mensagem;
            } catch {}
            throw new Error(msg);
          }
          fecharModal();
          fetchAutomaticas();
        } catch (err) {
          erroDiv.textContent = err.message;
          erroDiv.style.display = 'block';
        }
      });

      // Modal abrir/fechar
      if (btnAbrir && modal) {
        btnAbrir.addEventListener('click', function() {
          isEditMode = false;
          editingId = null;
          document.getElementById('modal-auto-titulo').textContent = 'Nova Transação Automática';
          modal.style.display = 'flex';
          if (customDiv) customDiv.style.display = 'none';
        });
      }
      if (btnFechar && modal) {
        btnFechar.addEventListener('click', fecharModal);
      }
      if (modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal) fecharModal();
        });
      }

      fetchAutomaticas();
    }
  }

  // Restore selected nav from localStorage or default to 'inicio'
  let selected = localStorage.getItem('selectedNav');
  let idx = navIds.indexOf(selected);
  // Forçar default para 'inicio' ao entrar na dashboard
  if (window.location.hash === '' || !selected || idx === -1) {
    selected = 'inicio';
    idx = 0;
    localStorage.setItem('selectedNav', 'inicio');
  }
  clearActive();
  if (navBtns[idx]) navBtns[idx].classList.add('active');
  renderPlaceholder(navIds[idx]);

  // Add click listeners
  navBtns.forEach((btn, i) => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      clearActive();
      btn.classList.add('active');
      localStorage.setItem('selectedNav', navIds[i]);
      renderPlaceholder(navIds[i]);
      // Re-attach tooltip and notifications logic after rendering new section
      attachTooltipAndNotifications();
    });
  });

  // --- TOOLTIP & NOTIFICATIONS LOGIC ---
  function attachTooltipAndNotifications() {
    // Tooltips
    navBtns.forEach(btn => {
      if (!btn) return;
      btn.addEventListener('mouseenter', function() {
        const tip = btn.querySelector('.nav-tooltip');
        if (tip) tip.style.opacity = '1';
      });
      btn.addEventListener('mouseleave', function() {
        const tip = btn.querySelector('.nav-tooltip');
        if (tip) tip.style.opacity = '';
      });
    });

    // --- NOTIFICAÇÕES ---
    const notifBtn = document.getElementById('notif-btn');
    const menuOverlay = document.getElementById('menu-overlay');
    let menuOpen = null;

    // Badge
    let notifBadge = document.getElementById('notif-badge');
    if (!notifBadge && notifBtn) {
      notifBadge = document.createElement('span');
      notifBadge.id = 'notif-badge';
      notifBtn.appendChild(notifBadge);
    }
    if (notifBadge) {
      notifBadge.style.position = 'absolute';
      notifBadge.style.top = '-7px';
      notifBadge.style.right = '-7px';
      notifBadge.style.zIndex = '2';
      notifBadge.style.pointerEvents = 'none';
      notifBadge.style.userSelect = 'none';
      notifBadge.style.display = 'none';
    }
    if (notifBtn) notifBtn.style.position = 'relative';

    // --- NOTIFICAÇÕES NA DB ---
    // API: /api/notificacoes (GET, PUT, DELETE)
    async function fetchNotificacoes() {
      const token = localStorage.getItem('token');
      if (!token) return [];
      try {
        const res = await fetch('http://localhost:3000/api/notificacoes', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    }
    async function marcarComoLida(id) {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`http://localhost:3000/api/notificacoes/${id}/lida`, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token }
      });
    }
    async function marcarTodasComoLidas() {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch('http://localhost:3000/api/notificacoes/lidas', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token }
      });
    }
    async function limparTodasNotificacoes() {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch('http://localhost:3000/api/notificacoes', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
    }

    // Atualiza badge
    async function updateBadge() {
      const notis = await fetchNotificacoes();
      const unread = notis.filter(n => !n.lida).length;
      if (notifBadge && notifBtn) {
        if (unread > 0) {
          notifBadge.textContent = unread > 9 ? '9+' : unread;
          notifBtn.classList.add('has-unread');
          notifBadge.style.display = 'block';
        } else {
          notifBadge.textContent = '';
          notifBtn.classList.remove('has-unread');
          notifBadge.style.display = 'none';
        }
      }
    }

    // Renderiza o dropdown de notificações
    async function renderNotisDropdown() {
      const notis = await fetchNotificacoes();
      let html = `
        <div class="menu-dropdown notificacoes-dropdown" id="notis-dropdown" style="min-width:270px;max-width:340px;width:100%;">
          <h3><i class="fa fa-bell"></i> Notificações</h3>
          <button class="fechar-notis-btn" title="Fechar"><i class="fa fa-times"></i></button>
          <div class="notificacoes-lista">
      `;
      if (!notis.length) {
        html += `<div class="notificacoes-vazio">Sem notificações automáticas recentes.</div>`;
      } else {
        notis.forEach(noti => {
          const dataStr = noti.data ? new Date(noti.data).toLocaleString('pt-PT') : '';
          html += `
            <div class="notificacao-item${noti.lida ? '' : ' unread'}" data-id="${noti._id}">
              <span class="notificacao-icone"><i class="fa ${noti.icone || 'fa-repeat'}"></i></span>
              <div class="notificacao-info">
                <div class="notificacao-titulo">${noti.nome || 'Transação Automática'}</div>
                <div class="notificacao-data">Executada em: ${dataStr}</div>
                <div class="notificacao-count">Total execuções: <b>${noti.execucoes || 1}</b></div>
              </div>
            </div>
          `;
        });
      }
      html += `</div>`;
      if (notis.some(n => !n.lida)) {
        html += `<button class="marcar-lidas-btn">Marcar todas como lidas</button>`;
      }
      if (notis.length) {
        html += `<button class="limpar-todas-btn">Limpar todas</button>`;
      }
      html += `</div>`;
      menuOverlay.innerHTML = html;
      menuOverlay.style.display = 'block';

      // Marcar como lida ao clicar numa notificação
      menuOverlay.querySelectorAll('.notificacao-item.unread').forEach(item => {
        item.addEventListener('click', async function(e) {
          e.stopPropagation();
          const id = item.getAttribute('data-id');
          await marcarComoLida(id);
          await updateBadge();
          await renderNotisDropdown();
        });
      });
      // Marcar todas como lidas
      const marcarBtn = menuOverlay.querySelector('.marcar-lidas-btn');
      if (marcarBtn) {
        marcarBtn.addEventListener('click', async function(e) {
          e.stopPropagation();
          await marcarTodasComoLidas();
          await updateBadge();
          await renderNotisDropdown();
        });
      }
      // Limpar todas
      const limparBtn = menuOverlay.querySelector('.limpar-todas-btn');
      if (limparBtn) {
        limparBtn.addEventListener('click', async function(e) {
          e.stopPropagation();
          if (confirm('Tem a certeza que quer apagar todas as notificações?')) {
            await limparTodasNotificacoes();
            await updateBadge();
            menuOpen = null;
            menuOverlay.innerHTML = '';
            menuOverlay.style.display = 'none';
          }
        });
      }
      // Fechar dropdown
      const fecharBtn = menuOverlay.querySelector('.fechar-notis-btn');
      if (fecharBtn) {
        fecharBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          menuOpen = null;
          menuOverlay.innerHTML = '';
          menuOverlay.style.display = 'none';
        });
      }
    }

    // Fechar ao clicar fora do dropdown ou ao clicar novamente no botão
    function closeMenuOnClickOutside(e) {
      if (menuOpen && notifBtn && menuOverlay && !notifBtn.contains(e.target) && !menuOverlay.contains(e.target)) {
        menuOpen = null;
        menuOverlay.innerHTML = '';
        menuOverlay.style.display = 'none';
        document.removeEventListener('mousedown', closeMenuOnClickOutside);
      }
    }

    // Abrir/fechar menu
    if (notifBtn) {
      notifBtn.onclick = async function(e) {
        e.stopPropagation();
        if (menuOpen === 'notificacoes') {
          menuOpen = null;
          menuOverlay.innerHTML = '';
          menuOverlay.style.display = 'none';
          document.removeEventListener('mousedown', closeMenuOnClickOutside);
          return;
        }
        menuOpen = 'notificacoes';
        await renderNotisDropdown();
        // Posiciona dropdown
        const menu = menuOverlay.querySelector('.menu-dropdown');
        if (menu) {
          const rect = notifBtn.getBoundingClientRect();
          const menuWidth = menu.offsetWidth || 320;
          let left = rect.right - menuWidth;
          if (left < 10) left = 10;
          if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
          menu.style.position = 'absolute';
          menu.style.left = `${left + window.scrollX}px`;
          menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
          menu.style.zIndex = 200;
        }
        // Attach close on click outside
        setTimeout(() => {
          document.addEventListener('mousedown', closeMenuOnClickOutside);
        }, 0);
      };
    }

    // Inicializa badge
    updateBadge();
  }
});