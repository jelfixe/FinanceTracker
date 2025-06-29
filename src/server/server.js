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
