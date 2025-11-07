// script.js - API para comunicação com Google Apps Script
class GoogleSheetsAPI {
    static obterConfiguracoesAtuais() {
        const padrao = {
            gas_url: 'https://script.google.com/macros/s/AKfycbwxQdTwfp8rUZf_knSEf8WbTEax4Jx7e9kFtXpkhPXD_Rzk8pvTfDnayfyaTF_ctIZP/exec',
            spreadsheet_id: '1dyGF2_jxJC2vANs_QPH4K36jaSRSCu5cg5F6ycwbAK4'
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
            const resposta = await this.request('testarConexao', {});
            return resposta && resposta.success;
        } catch (erro) {
            throw new Error('Falha na conexão: ' + erro.message);
        }
    }

    static async get(acao, parametros = {}) {
        return this.request(acao, parametros, 'GET');
    }

    static async request(acao, dados = {}, metodo = 'POST') {
        const config = this.obterConfiguracoesAtuais();
        
        if (!config.gas_url) {
            throw new Error('URL do GAS não configurada');
        }

        const url = new URL(config.gas_url);
        url.searchParams.set('action', acao);
        url.searchParams.set('spreadsheetId', config.spreadsheet_id);

        if (metodo === 'GET') {
            Object.keys(dados).forEach(key => {
                url.searchParams.set(key, JSON.stringify(dados[key]));
            });
        }

        const opcoes = {
            method: metodo,
            headers: metodo === 'POST' ? { 'Content-Type': 'application/json' } : {}
        };

        if (metodo === 'POST' && Object.keys(dados).length > 0) {
            opcoes.body = JSON.stringify(dados);
        }

        console.log(`📤 ${acao}:`, { url: url.toString(), dados });

        try {
            const resposta = await fetch(url.toString(), opcoes);
            const texto = await resposta.text();
            let resultado;

            try {
                resultado = JSON.parse(texto);
            } catch {
                throw new Error(`Resposta inválida: ${texto.substring(0, 100)}`);
            }

            if (!resposta.ok || resultado.error) {
                throw new Error(resultado.error || `Erro HTTP ${resposta.status}`);
            }

            console.log(`✅ ${acao}:`, resultado);
            return resultado;
        } catch (erro) {
            console.error(`❌ ${acao}:`, erro);
            throw new Error(`Falha na requisição: ${erro.message}`);
        }
    }
}

// Sistema de Notificações
class Notificacao {
    static mostrar(mensagem, tipo = 'info') {
        const existente = document.getElementById('notificacao-sistema');
        if (existente) existente.remove();
        
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
            animation: slideIn 0.3s ease;
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
        
        setTimeout(() => {
            if (notif.parentNode) notif.parentNode.removeChild(notif);
        }, 3000);
    }
    }
