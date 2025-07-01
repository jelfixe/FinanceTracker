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
    navBtns.forEach(btn => btn.classList.remove('active'));
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
        html = `<section class="dashboard-inicio">
          <div class="dashboard-resumo">
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
          <div class="dashboard-meta">
            <div class="meta-item"><i class="fa fa-list"></i> Total de transações: <b id="total-transacoes">0</b></div>
          </div>
          <div class="dashboard-graficos">
            <div>
              <div class="chart-title">Dinheiro gasto por Categoria</div>
              <canvas id="grafico-despesas-categorias"></canvas>
            </div>
            <div>
              <div class="chart-title">Receitas e Despesas por Mês</div>
              <canvas id="grafico-mensal"></canvas>
            </div>
          </div>
        </section>`;
        break;
      case 'saldo':
        html = `<section class="placeholder-section">
          <h1><i class="fa fa-wallet"></i> Saldo</h1>
          <p>Veja aqui o seu saldo detalhado.</p>
        </section>`;
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
          <div class="poupancas-filtros" style="display:flex;gap:1rem;align-items:center;margin-bottom:1.2rem;">
            <input type="text" id="pesquisa-poupanca" placeholder="Pesquisar..." style="flex:1;padding:0.5em 1em;border-radius:0.5em;border:1.5px solid #35365a;background:#191a2b;color:#e0defa;">
            <select id="filtro-poupanca-categoria" style="padding:0.5em 1em;border-radius:0.5em;border:1.5px solid #35365a;background:#191a2b;color:#e0defa;">
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
        html = `<section class="placeholder-section">
          <h1><i class="fa fa-repeat"></i> Transações Automáticas</h1>
          <p>Configure e visualize transações automáticas.</p>
        </section>`;
        break;
    }
    main.innerHTML = html;

    // --- DASHBOARD HOME: fetch transações e desenha gráficos ---
    if (section === 'inicio') {
      const token = localStorage.getItem('token');
      fetch('http://localhost:3000/api/transacoes', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
        .then(res => res.ok ? res.json() : [])
        .then(transacoes => {
          atualizarResumo(transacoes || []);
          document.getElementById('total-transacoes').textContent = transacoes.length;

          // --- Gráfico Pie: despesas por categoria ---
          const despesas = transacoes.filter(t => t.tipo === 'despesa');
          const categorias = {};
          despesas.forEach(t => {
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
                  '#6d5dd2', '#ff4b4b', '#ffe066', '#4bffb3', '#bdbdf7', '#8f7df7'
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: { display: true, text: '', color: '#e0defa', font: { size: 18 } },
                legend: { labels: { color: '#e0defa' } }
              }
            }
          });

          // --- Gráfico Bar: receitas e despesas por mês ---
          const meses = {};
          transacoes.forEach(t => {
            const d = new Date(t.data);
            const mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            if (!meses[mes]) meses[mes] = { receitas: 0, despesas: 0 };
            if (t.tipo === 'rendimento') meses[mes].receitas += Number(t.preco);
            if (t.tipo === 'despesa') meses[mes].despesas += Number(t.preco);
          });
          const mesesLabels = Object.keys(meses).sort();
          const receitasPorMes = mesesLabels.map(m => meses[m].receitas);
          const despesasPorMes = mesesLabels.map(m => meses[m].despesas);

          if (window.graficoMensal) window.graficoMensal.destroy();
          const ctxBar = document.getElementById('grafico-mensal').getContext('2d');
          window.graficoMensal = new Chart(ctxBar, {
            type: 'bar',
            data: {
              labels: mesesLabels,
              datasets: [
                {
                  label: 'Receitas',
                  data: receitasPorMes,
                  backgroundColor: '#4bffb3'
                },
                {
                  label: 'Despesas',
                  data: despesasPorMes,
                  backgroundColor: '#ff4b4b'
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: { display: true, text: '', color: '#e0defa', font: { size: 18 } },
                legend: { labels: { color: '#e0defa' } }
              },
              scales: {
                x: { ticks: { color: '#e0defa' } },
                y: { ticks: { color: '#e0defa' } }
              }
            }
          });
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
          const corBarra = concluida ? '#4bffb3' : '#6d5dd2';
          const corBorda = concluida ? '#4bffb3' : '#6d5dd2';
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
  }

  // Restore selected nav from localStorage or default to 'inicio'
  let selected = localStorage.getItem('selectedNav') || 'inicio';
  let idx = navIds.indexOf(selected);
  if (idx === -1) idx = 0;
  clearActive();
  navBtns[idx].classList.add('active');
  renderPlaceholder(navIds[idx]);

  // Add click listeners
  navBtns.forEach((btn, i) => {
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
      btn.addEventListener('mouseenter', function() {
        const tip = btn.querySelector('.nav-tooltip');
        if (tip) tip.style.opacity = '1';
      });
      btn.addEventListener('mouseleave', function() {
        const tip = btn.querySelector('.nav-tooltip');
        if (tip) tip.style.opacity = '';
      });
    });

    // Notifications
    const notifBtn = document.getElementById('notif-btn');
    const menuOverlay = document.getElementById('menu-overlay');
    let menuOpen = null;

    function getMenuPosition(btn) {
      const rect = btn.getBoundingClientRect();
      const menuWidth = 300;
      let left = rect.right - menuWidth;
      return {
        left: left + window.scrollX,
        top: rect.bottom + window.scrollY + 8 // 8px below
      };
    }

    function renderMenu(type, btn) {
      let html = '';
      if (type === 'notificacoes') {
        html = `<div class='menu-dropdown'><h3><i class='fa fa-bell'></i> Notificações</h3><div class='menu-content'>As suas notificações aparecerão aqui.</div></div>`;
      }
      menuOverlay.innerHTML = html;
      const menu = menuOverlay.querySelector('.menu-dropdown');
      if (menu) {
        const pos = getMenuPosition(btn);
        menu.style.position = 'absolute';
        menu.style.left = `${pos.left}px`;
        menu.style.top = `${pos.top}px`;
        menu.style.zIndex = 200;
      }
      menuOverlay.style.display = 'block';
    }

    function closeMenu() {
      menuOpen = null;
      menuOverlay.innerHTML = '';
      menuOverlay.style.display = 'none';
    }

    if (notifBtn) {
      notifBtn.onclick = function(e) {
        e.stopPropagation();
        if (menuOpen === 'notificacoes') {
          closeMenu();
          return;
        }
        menuOpen = 'notificacoes';
        renderMenu('notificacoes', notifBtn);
      };
    }
    document.addEventListener('click', function(e) {
      if (menuOpen && notifBtn && !notifBtn.contains(e.target) && !menuOverlay.contains(e.target)) {
        closeMenu();
      }
    });
  }

  // Attach tooltips and notifications on initial load
  attachTooltipAndNotifications();
});