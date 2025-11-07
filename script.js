// script.js - API para comunicação com Google Apps Script (VERSÃO CORRIGIDA)
class GoogleSheetsAPI {
    static obterConfiguracoesAtuais() {
        const padrao = {
            gas_url: '',
            spreadsheet_id: ''
        };
        const salvo = JSON.parse(localStorage.getItem('vanda_gas_config') || '{}');
        return { ...padrao, ...salvo };
    }

    static atualizarConfiguracoes(url, id) {
        const config = { gas_url: url, spreadsheet_id: id };
        localStorage.setItem('vanda_gas_config', JSON.stringify(config));
        return config;
    }

    static async testarConexao() {
        try {
            console.log('🔍 Iniciando teste de conexão...');
            const resposta = await this.get('testarConexao', {});
            console.log('✅ Resposta recebida:', resposta);
            return resposta && resposta.status === 'success';
        } catch (erro) {
            console.error('❌ Erro no teste:', erro);
            throw new Error('Falha na conexão: ' + erro.message);
        }
    }

    static async get(acao, parametros = {}) {
        return this.request(acao, parametros, 'GET');
    }

    static async request(acao, dados = {}, metodo = 'GET') {
        const config = this.obterConfiguracoesAtuais();
        
        if (!config.gas_url) {
            throw new Error('URL do GAS não configurada');
        }

        const url = new URL(config.gas_url);
        url.searchParams.set('action', acao);
        url.searchParams.set('spreadsheetId', config.spreadsheet_id);

        // Para GET, adiciona parâmetros na URL
        if (metodo === 'GET') {
            Object.keys(dados).forEach(key => {
                url.searchParams.set(key, JSON.stringify(dados[key]));
            });
        }

        console.log(`📤 ${metodo} ${acao}:`, url.toString());

        const opcoes = {
            method: metodo,
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'omit'
        };

        // Só adiciona headers e body para POST (quando necessário)
        if (metodo === 'POST' && Object.keys(dados).length > 0) {
            opcoes.headers = { 'Content-Type': 'application/json' };
            opcoes.body = JSON.stringify(dados);
        }

        try {
            const resposta = await fetch(url.toString(), opcoes);
            
            if (!resposta.ok) {
                throw new Error(`Erro HTTP ${resposta.status}: ${resposta.statusText}`);
            }
            
            const texto = await resposta.text();
            console.log('📨 Resposta bruta:', texto);
            
            let resultado;
            try {
                resultado = JSON.parse(texto);
            } catch (parseError) {
                throw new Error(`Resposta inválida do servidor: ${texto.substring(0, 100)}`);
            }

            if (resultado.status === 'error') {
                throw new Error(resultado.message || 'Erro no servidor');
            }

            console.log(`✅ ${acao} sucesso:`, resultado);
            return resultado;
        } catch (erro) {
            console.error(`❌ ${acao} falhou:`, erro);
            
            // Mensagem mais amigável para o usuário
            if (erro.message.includes('Failed to fetch') || erro.message.includes('NetworkError')) {
                throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão de internet.');
            } else if (erro.message.includes('CORS')) {
                throw new Error('Problema de segurança no servidor. Tente novamente.');
            } else {
                throw new Error(`Falha na requisição: ${erro.message}`);
            }
        }
    }
}

// Sistema de Notificações
class Notificacao {
    static mostrar(mensagem, tipo = 'info') {
        // Remove notificação existente
        const existente = document.getElementById('notificacao-sistema');
        if (existente) existente.remove();
        
        // Cria nova notificação
        const notif = document.createElement('div');
        notif.id = 'notificacao-sistema';
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-family: 'Segoe UI', system-ui, sans-serif;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        const cores = {
            success: '#28a745',
            error: '#dc3545', 
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        notif.style.backgroundColor = cores[tipo] || cores.info;
        notif.textContent = mensagem;
        document.body.appendChild(notif);
        
        // Remove após 4 segundos
        setTimeout(() => {
            if (notif.parentNode) notif.parentNode.removeChild(notif);
        }, 4000);
    }
}

// Configurações da página
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Configurações carregando...');
    await carregarConfiguracoes();
    atualizarCores();
});

async function carregarConfiguracoes() {
    console.log('📥 Carregando configurações salvas...');
    const configConexao = GoogleSheetsAPI.obterConfiguracoesAtuais();
    document.getElementById('urlGas').value = configConexao.gas_url;
    document.getElementById('spreadsheetId').value = configConexao.spreadsheet_id;

    try {
        console.log('🔄 Buscando dados da empresa...');
        const resposta = await GoogleSheetsAPI.get('obterEmpresa');
        const e = resposta.data?.empresa || {};
        document.getElementById('nomeEmpresa').value = e.nome || '';
        document.getElementById('enderecoFiscal').value = e.endereco || '';
        document.getElementById('telefone').value = e.telefone || '';
        document.getElementById('email').value = e.email || '';
        if (e.corPrimaria) document.getElementById('corPrimaria').value = e.corPrimaria;
        if (e.corSecundaria) document.getElementById('corSecundaria').value = e.corSecundaria;
        atualizarCores();
        console.log('✅ Dados da empresa carregados');
    } catch (ex) {
        console.warn('⚠️ Empresa não configurada ou erro ao carregar:', ex);
    }
}

function atualizarCores() {
    const c1 = document.getElementById('corPrimaria').value;
    const c2 = document.getElementById('corSecundaria').value;
    document.documentElement.style.setProperty('--cor-primaria', c1);
    document.documentElement.style.setProperty('--cor-secundaria', c2);
    document.documentElement.style.setProperty('--fundo-gradiente', `linear-gradient(135deg, ${c1}, ${c2})`);
    document.getElementById('previewPrimaria').style.backgroundColor = c1;
    document.getElementById('previewSecundaria').style.backgroundColor = c2;
    document.getElementById('previewNome').textContent = document.getElementById('nomeEmpresa').value || 'Sua Loja';
}

async function testarConexao() {
    console.log('🎯 Botão Testar Conexão clicado');
    
    const url = document.getElementById('urlGas').value.trim();
    const id = document.getElementById('spreadsheetId').value.trim();
    
    if (!url || !id) {
        Notificacao.mostrar('❌ Preencha URL e ID da planilha', 'error');
        return;
    }
    
    console.log('💾 Salvando configurações...');
    GoogleSheetsAPI.atualizarConfiguracoes(url, id);
    
    try {
        Notificacao.mostrar('🔍 Testando conexão...', 'info');
        console.log('🔄 Iniciando teste de conexão...');
        
        await GoogleSheetsAPI.testarConexao();
        
        mostrarStatus('✅ Conexão bem-sucedida!', true);
        Notificacao.mostrar('✅ Conexão com Google Sheets estabelecida!', 'success');
        console.log('🎉 Conexão testada com sucesso!');
        
    } catch (err) {
        console.error('💥 Erro na conexão:', err);
        mostrarStatus('❌ Falha: ' + err.message, false);
        Notificacao.mostrar('❌ ' + err.message, 'error');
    }
}

function mostrarStatus(msg, sucesso) {
    const el = document.getElementById('statusConexao');
    el.textContent = msg;
    el.className = 'status-box ' + (sucesso ? 'status-success' : 'status-error');
    el.style.display = 'block';
}

function salvarConexao() {
    const url = document.getElementById('urlGas').value.trim();
    const id = document.getElementById('spreadsheetId').value.trim();
    
    if (!url || !id) {
        Notificacao.mostrar('❌ Preencha ambos os campos', 'error');
        return;
    }
    
    GoogleSheetsAPI.atualizarConfiguracoes(url, id);
    mostrarStatus('✅ Configuração salva localmente.', true);
    Notificacao.mostrar('✅ Configurações salvas!', 'success');
}

async function salvarEmpresa() {
    const dados = {
        nome: document.getElementById('nomeEmpresa').value,
        endereco: document.getElementById('enderecoFiscal').value,
        telefone: document.getElementById('telefone').value,
        email: document.getElementById('email').value,
        corPrimaria: document.getElementById('corPrimaria').value,
        corSecundaria: document.getElementById('corSecundaria').value
    };
    
    try {
        Notificacao.mostrar('💾 Salvando dados da empresa...', 'info');
        console.log('🔄 Enviando dados da empresa:', dados);
        
        await GoogleSheetsAPI.request('salvarEmpresa', dados, 'POST');
        
        Notificacao.mostrar('✅ Identidade da loja salva com sucesso!', 'success');
        localStorage.setItem('vanda_empresa', JSON.stringify(dados));
        console.log('🎉 Dados da empresa salvos!');
        
    } catch (err) {
        console.error('💥 Erro ao salvar empresa:', err);
        Notificacao.mostrar('❌ Erro: ' + err.message, 'error');
    }
}
