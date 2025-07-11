<div align="center">

<img src="image_repo.png" width="800"/>


*Promovendo Decisões Financeiras Mais Inteligentes Diariamente*

![last commit](https://img.shields.io/github/last-commit/jelfixe/FinanceTracker?label=last%20commit&style=flat&color=blue)
![javascript](https://img.shields.io/badge/javascript-61.6%25-blue?style=flat&logo=javascript&logoColor=white)
![languages](https://img.shields.io/badge/languages-3-blue?style=flat)

</div>

<div align="center">

### *Desenvolvido com as ferramentas e tecnologias:*

![Express](https://img.shields.io/badge/Express-black?style=flat&logo=express&logoColor=white)
![JSON](https://img.shields.io/badge/JSON-white?style=flat&logo=json&logoColor=black)
![Markdown](https://img.shields.io/badge/Markdown-000000?style=flat&logo=markdown&logoColor=white)
![npm](https://img.shields.io/badge/npm-CB3837?style=flat&logo=npm&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat&logo=mongoose&logoColor=white)
![.ENV](https://img.shields.io/badge/.ENV-ECD53F?style=flat)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![bcrypt](https://img.shields.io/badge/bcrypt-05122E?style=flat&logo=bcrypt&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=json-web-tokens&logoColor=white)
![FontAwesome](https://img.shields.io/badge/Font%20Awesome-528DD7?style=flat&logo=font-awesome&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-F5A524?style=flat&logo=chart.js&logoColor=white)
![CORS](https://img.shields.io/badge/CORS-2F88A6?style=flat&logo=cors&logoColor=white)

</div>

# Instalação e Execução do Projeto

### 1. Clonar o repositório
```bash
git clone https://github.com/jelfixe/FinanceTracker
cd FinanceTracker
```

### 2. Aceder à pasta do servidor
```bash
cd src/server
```


### 3. Instalar as dependências
```bash
npm install
```

### 4. Iniciar o servidor
```bash
npm start
```

Após iniciar o servidor, acede à aplicação no navegador:

[http://localhost:porta/login.html](http://localhost:3000/login.html)

# Configuração do Ficheiro `.env`

Antes de iniciares o servidor, certifica-te de criar um ficheiro `.env` na pasta `src/server` com as seguintes variáveis de ambiente:

### URI de ligação ao MongoDB Atlas
```env
MONGODB_URI=mongodb+srv://utilizador:password@oteucluster
```
### Nome da base de dados MongoDB
```env
MONGODB_DB=nome_da_base_de_dados
```

### Nome da coleção onde os dados serão armazenados
```env
MONGODB_COLLECTION=nome_da_colecao
```

### Segredo utilizado para geração e validação de tokens JWT
```env
JWT_SECRET=jwt_secret_aqui
```

### Porta na qual o servidor irá correr (ex: 3000)
```env
PORT=porta_aqui
```