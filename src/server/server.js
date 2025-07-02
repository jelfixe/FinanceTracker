require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../pages')));

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let dbConnection = null;

async function connectDB() {
    if (dbConnection) return dbConnection;
    
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const users = db.collection(process.env.MONGODB_COLLECTION);
    await users.createIndex({ email: 1 }, { unique: true });
    
    dbConnection = { db, users };
    return dbConnection;
}

app.post('/api/registar', async (req, res) => {
    try {
        const { email, password, nome, dataNascimento } = req.body;
        if (!email || !password || !nome || !dataNascimento) {
            return res.status(400).json({ mensagem: 'Por favor, preencha todos os campos.' });
        }
        const { users } = await connectDB();
        const hashedPassword = await bcrypt.hash(password, 10);
        await users.insertOne({
            email,
            password: hashedPassword,
            nome,
            dataNascimento
        });
        res.status(201).json({ mensagem: 'Utilizador criado com sucesso' });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ mensagem: 'Email já registado' });
        } else {
            res.status(500).json({ mensagem: 'Erro ao registar utilizador' });
        }
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { users } = await connectDB();
        const user = await users.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).json({ mensagem: 'Utilizador não encontrado' });
        }
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(400).json({ mensagem: 'Password inválida' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.json({ mensagem: 'Login efetuado com sucesso!', token });
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao fazer login' });
    }
});

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ mensagem: 'Token não fornecido' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ mensagem: 'Token inválido' });
    }
}

app.get('/api/user', authMiddleware, async (req, res) => {
    try {
        const { users } = await connectDB();
        const user = await users.findOne({ _id: new ObjectId(req.userId) });
        if (!user) return res.status(404).json({ mensagem: 'Utilizador não encontrado' });
        res.json({ nome: user.nome, email: user.email });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao obter utilizador' });
    }
});

// --- ROTAS DE TRANSACOES ---
app.get('/api/transacoes', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const transacoes = db.collection('transacoes');
        // Ensure userId is always a string for querying
        const lista = await transacoes.find({ userId: String(req.userId) }).sort({ data: -1 }).toArray();
        // Sempre retorna _id como string
        const listaFormatada = lista.map(tran => ({
            ...tran,
            _id: tran._id && tran._id.toString ? tran._id.toString() : tran._id
        }));
        res.json(listaFormatada);
    } catch (err) {
        console.error('Erro ao obter transações:', err);
        res.status(500).json({ mensagem: 'Erro ao obter transações' });
    }
});

app.post('/api/transacoes', authMiddleware, async (req, res) => {
    try {
        const { nome, data, icone, preco, tipo } = req.body;
        if (!nome || !data || !icone || !preco || !tipo) {
            return res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
        }
        // Validate data is a valid date string
        if (isNaN(Date.parse(data))) {
            return res.status(400).json({ mensagem: 'Data inválida.' });
        }
        // Validate preco is a positive number
        if (isNaN(preco) || Number(preco) <= 0) {
            return res.status(400).json({ mensagem: 'Preço inválido.' });
        }

        const { db } = await connectDB();
        const transacoes = db.collection('transacoes');
        const nova = {
            userId: String(req.userId),
            nome,
            data,
            icone,
            preco: Number(preco),
            tipo,
            createdAt: new Date()
        };

        const resultado = await transacoes.insertOne(nova);
        res.status(201).json({ mensagem: 'Transação guardada com sucesso', id: resultado.insertedId });
    } catch (err) {
        console.error('Erro ao guardar transação:', err, req.body);
        res.status(500).json({ mensagem: 'Erro ao guardar transação', erro: err.message });
    }
});

// Editar transação
app.put('/api/transacoes/:id', authMiddleware, async (req, res) => {
    try {
        // Remover _id do body se vier do frontend
        if ('_id' in req.body) delete req.body._id;
        const { nome, data, icone, preco, tipo } = req.body;
        if (!nome || !data || !icone || !preco || !tipo) {
            return res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
        }
        if (isNaN(Date.parse(data))) {
            return res.status(400).json({ mensagem: 'Data inválida.' });
        }
        if (isNaN(preco) || Number(preco) <= 0) {
            return res.status(400).json({ mensagem: 'Preço inválido.' });
        }
        const { db } = await connectDB();
        const transacoes = db.collection('transacoes');
        const id = req.params.id;
        const resultado = await transacoes.updateOne(
            { _id: new ObjectId(id), userId: String(req.userId) },
            { $set: { nome, data, icone, preco: Number(preco), tipo } }
        );
        if (resultado.matchedCount === 0) {
            return res.status(404).json({ mensagem: 'Transação não encontrada.' });
        }
        res.json({ mensagem: 'Transação atualizada com sucesso.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao atualizar transação.', erro: err.message });
    }
});

// Apagar transação
app.delete('/api/transacoes/:id', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const transacoes = db.collection('transacoes');
        const id = req.params.id;
        // Validação de ObjectId
        if (!id || typeof id !== 'string' || !id.match(/^[a-fA-F0-9]{24}$/)) {
            return res.status(400).json({ mensagem: 'ID de transação inválido.' });
        }
        // Garante que só apaga se for do user
        const resultado = await transacoes.deleteOne({ _id: new ObjectId(id), userId: String(req.userId) });
        if (resultado.deletedCount === 0) {
            return res.status(404).json({ mensagem: 'Transação não encontrada para este utilizador.' });
        }
        res.json({ mensagem: 'Transação removida com sucesso.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao apagar transação.', erro: err.message });
    }
});

// --- ROTAS DE POUPANCAS ---
// Listar todas as poupancas do utilizador
app.get('/api/poupancas', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const poupancas = db.collection('poupancas');
        const lista = await poupancas.find({ userId: String(req.userId) }).sort({ createdAt: -1 }).toArray();
        const listaFormatada = lista.map(goal => ({
            ...goal,
            _id: goal._id && goal._id.toString ? goal._id.toString() : goal._id
        }));
        res.json(listaFormatada);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao obter poupancas' });
    }
});

// Criar nova poupanca
app.post('/api/poupancas', authMiddleware, async (req, res) => {
    try {
        const { nome, descricao, icone, valorMeta, dataLimite } = req.body;
        if (!nome || !descricao || !icone || !valorMeta || !dataLimite) {
            return res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
        }
        if (isNaN(valorMeta) || Number(valorMeta) <= 0) {
            return res.status(400).json({ mensagem: 'Valor da meta inválido.' });
        }
        if (isNaN(Date.parse(dataLimite))) {
            return res.status(400).json({ mensagem: 'Data limite inválida.' });
        }
        const { db } = await connectDB();
        const poupancas = db.collection('poupancas');
        // --- PREVINE DUPLICADOS: não permite criar se já existir uma poupanca igual para o user ---
        const existente = await poupancas.findOne({
            userId: String(req.userId),
            nome,
            valorMeta: Number(valorMeta),
            dataLimite
        });
        if (existente) {
            return res.status(409).json({ mensagem: 'Já existe uma poupança com o mesmo nome, meta e data limite.' });
        }
        const nova = {
            userId: String(req.userId),
            nome,
            descricao,
            icone,
            valorMeta: Number(valorMeta),
            valorAtual: 0,
            dataLimite,
            concluida: false,
            createdAt: new Date()
        };
        const resultado = await poupancas.insertOne(nova);
        res.status(201).json({ mensagem: 'Poupança criada com sucesso', id: resultado.insertedId });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao criar poupanca', erro: err.message });
    }
});

// Adicionar dinheiro à poupanca
app.put('/api/poupancas/:id/add', authMiddleware, async (req, res) => {
    try {
        const { valor } = req.body;
        if (isNaN(valor) || Number(valor) <= 0) {
            return res.status(400).json({ mensagem: 'Valor inválido.' });
        }
        const { db } = await connectDB();
        const poupancas = db.collection('poupancas');
        const id = req.params.id;
        const goal = await poupancas.findOne({ _id: new ObjectId(id), userId: String(req.userId) });
        if (!goal) {
            return res.status(404).json({ mensagem: 'Poupança não encontrada.' });
        }
        if (goal.concluida) {
            return res.status(400).json({ mensagem: 'Poupança já concluída.' });
        }
        let novoValor = (goal.valorAtual || 0) + Number(valor);
        if (novoValor > goal.valorMeta) novoValor = goal.valorMeta;
        const resultado = await poupancas.updateOne(
            { _id: new ObjectId(id), userId: String(req.userId) },
            { $set: { valorAtual: novoValor } }
        );
        res.json({ mensagem: 'Valor adicionado com sucesso.', valorAtual: novoValor });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao adicionar valor.', erro: err.message });
    }
});

// Concluir poupanca
app.put('/api/poupancas/:id/concluir', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const poupancas = db.collection('poupancas');
        const id = req.params.id;
        const goal = await poupancas.findOne({ _id: new ObjectId(id), userId: String(req.userId) });
        if (!goal) {
            return res.status(404).json({ mensagem: 'Poupança não encontrada.' });
        }
        if (goal.valorAtual < goal.valorMeta) {
            return res.status(400).json({ mensagem: 'Meta ainda não atingida.' });
        }
        await poupancas.updateOne(
            { _id: new ObjectId(id), userId: String(req.userId) },
            { $set: { concluida: true } }
        );
        res.json({ mensagem: 'Poupança concluída com sucesso.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao concluir poupanca.', erro: err.message });
    }
});

// Editar poupanca
app.put('/api/poupancas/:id', authMiddleware, async (req, res) => {
    try {
        if ('_id' in req.body) delete req.body._id;
        const { nome, descricao, icone, valorMeta, dataLimite } = req.body;
        if (!nome || !descricao || !icone || !valorMeta || !dataLimite) {
            return res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
        }
        if (isNaN(valorMeta) || Number(valorMeta) <= 0) {
            return res.status(400).json({ mensagem: 'Valor da meta inválido.' });
        }
        if (isNaN(Date.parse(dataLimite))) {
            return res.status(400).json({ mensagem: 'Data limite inválida.' });
        }
        const { db } = await connectDB();
        const poupancas = db.collection('poupancas');
        const id = req.params.id;
        // Apenas faz update, nunca cria nova nem verifica duplicados
        const resultado = await poupancas.updateOne(
            { _id: new ObjectId(id), userId: String(req.userId) },
            { $set: { nome, descricao, icone, valorMeta: Number(valorMeta), dataLimite } }
        );
        if (resultado.matchedCount === 0) {
            return res.status(404).json({ mensagem: 'Poupança não encontrada.' });
        }
        res.json({ mensagem: 'Poupança atualizada com sucesso.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao atualizar poupança.', erro: err.message });
    }
});

// Apagar poupanca
app.delete('/api/poupancas/:id', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const poupancas = db.collection('poupancas');
        const id = req.params.id;
        if (!id || typeof id !== 'string' || !id.match(/^[a-fA-F0-9]{24}$/)) {
            return res.status(400).json({ mensagem: 'ID de poupanca inválido.' });
        }
        const resultado = await poupancas.deleteOne({ _id: new ObjectId(id), userId: String(req.userId) });
        if (resultado.deletedCount === 0) {
            return res.status(404).json({ mensagem: 'Poupança não encontrada para este utilizador.' });
        }
        res.json({ mensagem: 'Poupança removida com sucesso.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao apagar poupanca.', erro: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('API Finance Tracker ativa!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await client.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    try {
        await client.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
});

// --- ROTAS DE TRANSACOES AUTOMATICAS ---

// Listar todas as transações automáticas do utilizador
app.get('/api/automaticas', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const automaticas = db.collection('automaticas');
        const lista = await automaticas.find({ userId: String(req.userId) }).sort({ createdAt: -1 }).toArray();
        const listaFormatada = lista.map(auto => ({
            ...auto,
            _id: auto._id && auto._id.toString ? auto._id.toString() : auto._id
        }));
        res.json(listaFormatada);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao obter transações automáticas' });
    }
});

// Criar nova transação automática
app.post('/api/automaticas', authMiddleware, async (req, res) => {
    try {
        const { nome, icone, preco, tipo, frequencia, customMinutos } = req.body;
        if (!nome || !icone || !preco || !tipo || !frequencia) {
            return res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
        }
        if (isNaN(preco) || Number(preco) <= 0) {
            return res.status(400).json({ mensagem: 'Preço inválido.' });
        }
        if (frequencia === 'custom' && (!customMinutos || isNaN(customMinutos) || Number(customMinutos) < 1)) {
            return res.status(400).json({ mensagem: 'Intervalo custom inválido.' });
        }
        const { db } = await connectDB();
        const automaticas = db.collection('automaticas');
        const nova = {
            userId: String(req.userId),
            nome,
            icone,
            preco: Number(preco),
            tipo,
            frequencia,
            customMinutos: frequencia === 'custom' ? Number(customMinutos) : undefined,
            ultimaExecucao: null,
            execucoes: 0,
            createdAt: new Date()
        };
        const resultado = await automaticas.insertOne(nova);
        res.status(201).json({ mensagem: 'Transação automática criada com sucesso', id: resultado.insertedId });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao criar transação automática', erro: err.message });
    }
});

// Editar transação automática
app.put('/api/automaticas/:id', authMiddleware, async (req, res) => {
    try {
        if ('_id' in req.body) delete req.body._id;
        const { nome, icone, preco, tipo, frequencia, customMinutos } = req.body;
        if (!nome || !icone || !preco || !tipo || !frequencia) {
            return res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
        }
        if (isNaN(preco) || Number(preco) <= 0) {
            return res.status(400).json({ mensagem: 'Preço inválido.' });
        }
        if (frequencia === 'custom' && (!customMinutos || isNaN(customMinutos) || Number(customMinutos) < 1)) {
            return res.status(400).json({ mensagem: 'Intervalo custom inválido.' });
        }
        const { db } = await connectDB();
        const automaticas = db.collection('automaticas');
        const id = req.params.id;
        const resultado = await automaticas.updateOne(
            { _id: new ObjectId(id), userId: String(req.userId) },
            { $set: {
                nome, icone, preco: Number(preco), tipo, frequencia,
                customMinutos: frequencia === 'custom' ? Number(customMinutos) : undefined
            } }
        );
        if (resultado.matchedCount === 0) {
            return res.status(404).json({ mensagem: 'Transação automática não encontrada.' });
        }
        res.json({ mensagem: 'Transação automática atualizada com sucesso.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao atualizar transação automática.', erro: err.message });
    }
});

// Apagar transação automática
app.delete('/api/automaticas/:id', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const automaticas = db.collection('automaticas');
        const id = req.params.id;
        if (!id || typeof id !== 'string' || !id.match(/^[a-fA-F0-9]{24}$/)) {
            return res.status(400).json({ mensagem: 'ID de transação automática inválido.' });
        }
        const resultado = await automaticas.deleteOne({ _id: new ObjectId(id), userId: String(req.userId) });
        if (resultado.deletedCount === 0) {
            return res.status(404).json({ mensagem: 'Transação automática não encontrada para este utilizador.' });
        }
        res.json({ mensagem: 'Transação automática removida com sucesso.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao apagar transação automática.', erro: err.message });
    }
});

// --- NOTIFICAÇÕES (API) ---
// Estrutura: { _id, userId, nome, icone, execucoes, data, lida: bool }
function getNotificacoesCollection(db) {
    return db.collection('notificacoes');
}

// GET /api/notificacoes - lista todas as notificações do utilizador (mais recentes primeiro)
app.get('/api/notificacoes', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const notis = getNotificacoesCollection(db);
        const lista = await notis.find({ userId: String(req.userId) }).sort({ data: -1 }).toArray();
        // _id sempre string
        const listaFormatada = lista.map(n => ({
            ...n,
            _id: n._id && n._id.toString ? n._id.toString() : n._id
        }));
        res.json(listaFormatada);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao obter notificações.' });
    }
});

// PUT /api/notificacoes/:id/lida - marca uma notificação como lida
app.put('/api/notificacoes/:id/lida', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const notis = getNotificacoesCollection(db);
        const id = req.params.id;
        const resultado = await notis.updateOne(
            { _id: new ObjectId(id), userId: String(req.userId) },
            { $set: { lida: true } }
        );
        if (resultado.matchedCount === 0) {
            return res.status(404).json({ mensagem: 'Notificação não encontrada.' });
        }
        res.json({ mensagem: 'Notificação marcada como lida.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao marcar como lida.' });
    }
});

// PUT /api/notificacoes/lidas - marca todas como lidas
app.put('/api/notificacoes/lidas', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const notis = getNotificacoesCollection(db);
        await notis.updateMany(
            { userId: String(req.userId), lida: { $ne: true } },
            { $set: { lida: true } }
        );
        res.json({ mensagem: 'Todas as notificações marcadas como lidas.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao marcar todas como lidas.' });
    }
});

// DELETE /api/notificacoes - apaga todas as notificações do utilizador
app.delete('/api/notificacoes', authMiddleware, async (req, res) => {
    try {
        const { db } = await connectDB();
        const notis = getNotificacoesCollection(db);
        await notis.deleteMany({ userId: String(req.userId) });
        res.json({ mensagem: 'Todas as notificações apagadas.' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao apagar notificações.' });
    }
});

// --- CRIAR NOTIFICAÇÕES AUTOMÁTICAS QUANDO UMA AUTOMÁTICA EXECUTA ---
// Adiciona notificação quando uma transação automática é executada
async function criarNotificacaoAutomatica(db, auto, dataExecucao) {
    const notis = getNotificacoesCollection(db);
    // Não duplica se já existir para esta execução
    const existe = await notis.findOne({
        userId: String(auto.userId),
        idAutomatica: auto._id ? auto._id.toString() : undefined,
        data: dataExecucao
    });
    if (!existe) {
        await notis.insertOne({
            userId: String(auto.userId),
            idAutomatica: auto._id ? auto._id.toString() : undefined,
            nome: auto.nome,
            icone: auto.icone,
            tipo: auto.tipo,
            execucoes: (auto.execucoes || 1),
            data: dataExecucao,
            lida: false
        });
    }
}

// --- EXECUÇÃO AUTOMÁTICA DAS TRANSAÇÕES AUTOMÁTICAS ---
setInterval(async () => {
    try {
        const { db } = await connectDB();
        const automaticas = db.collection('automaticas');
        const transacoes = db.collection('transacoes');
        const now = new Date();

        const todas = await automaticas.find({}).toArray();
        for (const auto of todas) {
            let deveExecutar = false;
            let ultima = auto.ultimaExecucao ? new Date(auto.ultimaExecucao) : null;
            switch (auto.frequencia) {
                case 'diario':
                    if (!ultima || now.getDate() !== ultima.getDate() || now - ultima > 24*60*60*1000) {
                        if (!ultima || now - ultima >= 23*60*60*1000) deveExecutar = true;
                    }
                    break;
                case 'semanal':
                    if (!ultima || now.getDay() === 1 && (now - ultima > 6*24*60*60*1000)) {
                        if (!ultima || now - ultima >= 6*24*60*60*1000) deveExecutar = true;
                    }
                    break;
                case 'mensal':
                    if (!ultima || now.getMonth() !== ultima.getMonth() || now - ultima > 27*24*60*60*1000) {
                        if (!ultima || now - ultima >= 27*24*60*60*1000) deveExecutar = true;
                    }
                    break;
                case 'anual':
                    if (!ultima || now.getFullYear() !== ultima.getFullYear() || now - ultima > 364*24*60*60*1000) {
                        if (!ultima || now - ultima >= 364*24*60*60*1000) deveExecutar = true;
                    }
                    break;
                case 'custom':
                    if (!ultima || now - ultima >= (auto.customMinutos || 1) * 60 * 1000) {
                        deveExecutar = true;
                    }
                    break;
            }
            if (deveExecutar) {
                await transacoes.insertOne({
                    userId: auto.userId,
                    nome: auto.nome,
                    data: now.toISOString(),
                    icone: auto.icone,
                    preco: auto.preco,
                    tipo: auto.tipo,
                    createdAt: now,
                    automatico: true,
                    idAutomatica: auto._id ? auto._id.toString() : undefined
                });
                await automaticas.updateOne(
                    { _id: auto._id },
                    { $set: { ultimaExecucao: now }, $inc: { execucoes: 1 } }
                );
                // --- CRIA NOTIFICAÇÃO ---
                await criarNotificacaoAutomatica(db, auto, now.toISOString());
            }
        }
    } catch (err) {
        console.error('Erro no cron de transações automáticas:', err);
    }
}, 60 * 1000); // a cada minuto
