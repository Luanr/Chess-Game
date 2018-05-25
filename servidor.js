var express = require('express')
var app = express();
var bodyParser = require('body-parser');
const WebSocket = require('ws');
var vetorClientes = [];
var partidas = [];

const TIMEOUT = 10000;

const wss = new WebSocket.Server({
    port: 8080
}, function () {
    console.log('SERVIDOR WEBSOCKETS na porta 8080');
});


function criaTabuleiro() {

    let tabuleiro = new Array(8);
    for (var i = 0; i < 8; i++) {
        tabuleiro[i] = new Array(8);
    }

    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < 8; j++) {
            tabuleiro[i][j] = 0; // branco
            tabuleiro[i + 6][j] = 1; // preto
        }
    }
    console.log(tabuleiro);
    return tabuleiro;
}


function PERIODICA() {
    let agora = Date.now();

    let x = 0;
    while (x < vetorClientes.length) {
        if ((vetorClientes[x].validado == false) && ((agora - vetorClientes[x].timestamp) > TIMEOUT)) {
            console.log('remove usuario da lista de ativos')
            let MSG = {
                tipo: 'ERRO',
                valor: 'timeout'
            };
            vetorClientes[x].send(JSON.stringify(MSG));
            vetorClientes[x].close();
            vetorClientes.splice(x, 1);
            atualizaUsers();
        } else x++;

    }

    // envia vetor dos clientes logados para todos os usuarios
    //console.log(JSON.stringify(vetorClientes));

    //atualizaUsers();
    // faz broadcast da msg
    //fazBroadcast(msg);
}

// envia para os clientes a lista de usuários online no momento que n foram desconectados
function atualizaUsers() {
    var aux = [];

    for (var i = 0; i < vetorClientes.length; i++) {
        if (vetorClientes[i].validado == true) {
            aux.push(vetorClientes[i].nome);
        } else {
            aux.push('Visitante');
        }
    }

    let MSG = {
        tipo: 'USERS',
        valor: aux
    };

    fazBroadcast(MSG);
}

function mensagemPrivada(remetente, msg) {
    for (let x = 0; x < vetorClientes.length; x++) {
        try {
            if (vetorClientes[x].nome == remetente)
                vetorClientes[x].send(JSON.stringify(msg));
        } catch (e) {

        }
    }
}

function fazBroadcast(msg) {
    for (let x = 0; x < vetorClientes.length; x++) {
        try {
            if (vetorClientes[x].validado == true)
                vetorClientes[x].send(JSON.stringify(msg));
        } catch (e) {

        }
    }
}


wss.on('connection', function connection(ws) {
    ws.timestamp = Date.now();

    ws.validado = false;

    //  ws.nome='Visitante';  

    vetorClientes.push(ws);

    ws.on('close', function close() {
        for (let x = 0; x < vetorClientes.length; x++) {
            if (vetorClientes[x] == ws) {
                vetorClientes.splice(x, 1);
                break;
            }
        }
        console.log('Cliente desconectou');
    });

    ws.on('message', function incoming(MSG) {

        MSG = JSON.parse(MSG);

        console.log("tipo msg = " + MSG.tipo);
        if (MSG.tipo == 'LOGIN') {
            //mostra o login

            console.log('login');
            console.log('ID=', MSG.valor.ID + '  password=', MSG.valor.password)
            // MSG.valor.password = (SHA256(MSG.valor.password).toString());


            fazBroadcast(MSG);
            atualizaUsers();
            //console.log(MSG);

            console.log('validou usuario')

            ws.nome = MSG.valor.ID;
            ws.validado = true;


            // se n for validado
            // msg de erro
            // ws.close();

            console.log("recebi " + MSG.tipo);

        } else if (MSG.tipo == 'CONVITE') {

            // envia msg privada para o destinatário cossssssm a mesma mensagem
            resp = console.log("Enviando pm para " + MSG.valor.TO);

            MSG.valor.tabuleiro = criaTabuleiro();

            mensagemPrivada(MSG.valor.TO, MSG);
        } else if (MSG.tipo == 'RESP_CONVITE') { // usuário diz que aceitou convite de partida
            if (MSG.valor.resp == true) {

                let novoTabuleiro = criaTabuleiro();

                // respondeu que deu boa e inicializa partida
                console.log("começa partida!");
                console.log(novoTabuleiro);
                inserePartida(MSG.valor.FROM, MSG.valor.TO, novoTabuleiro);

            }
            // envia a resposta do convite para quem fez o envio
            mensagemPrivada(MSG.valor.FROM, MSG);
        } else if (MSG.tipo == 'PARTIDA') {
            /* 
		exemplo de msg que chegará:

		let msg_valor = {jogador: meuID, oponente:partidaAtual.valor.FROM, lado:partidaAtual.lado, xi: posUltimoClick.x,yi: posUltimoClick.y,xf: posMtrix.x,yf: posMatrix.y};
        let msg = {tipo: 'PARTIDA', valor: msg_valor};
    	*/

            let recebido = MSG.valor;

            let partida = procuraPartida(recebido);
            let xi, yi, xf, yf, lado;

            xi = recebido.xi;
            yi = recebido.yi;
            xf = recebido.xf;
            yf = recebido.yf;
            lado = recebido.lado;

            try {
                if (jogadaValida(xi, yi, xf, yf, lado)) {
                    movePeca(xi, yi, xf, yf, partida);
                    let mensagem = {
                        tipo: 'ATUALIZA_TABULEIRO',
                        valor: partida.tabuleiro
                    };
                    console.log(mensagem.valor);
                    mensagemPrivada(recebido.oponente, mensagem);
                    console.log("enviada msg de atualizacao de tabuleiro")
                }

            } catch (e) {
                console.log("erro na partida ", e);
            }
        }
    });
});

/* 
funções sobre o tabuleiro

*/

function jogadaValida(xi, yi, xf, yf, lado) {
    // por enquanto estamos validando todas as jogadas feitas
    return true;
}

// logicamente passaria tabuleiro como argumento, porém é possível apenas fazer mudança em objetos por referência
function movePeca(xi, yi, xf, yf, partida) {
    let pecaMovida = partida.tabuleiro[yi][xi];
    // coloca a peca no lugar estipulado
    partida.tabuleiro[yf][xf] = pecaMovida;
    // remove a antiga, igualando ela a undefined
    partida.tabuleiro[yi][xi] = undefined;
}


function inserePartida(player1, player2, tabuleiro) {

    var partida = {
        player1: player1,
        player2: player2,
        tabuleiro: tabuleiro,
        vez: 0
    }
    partidas.push(partida);
}

function procuraPartida(player) { // retorna partida que o usr esta
    // player = MSG.valor --> jogador é player.jogador

    for (var i = 0; i < partidas.length; i++) {
        if (partidas[i].player1.nome == player.jogador.nome || partidas[i].player2.nome == player.jogador.nome) {
            console.log(partidas[i].tabuleiro);
            return partidas[i];
        }
    }
    console.log("RETORNEI UNDEFINED");
    return undefined;
}


// fim de funcoes sobre o tabuleiro


app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, resp) {
    resp.write("teste");
    resp.end();
});



app.get(/^(.+)$/, function (req, res) {
    try {
        res.write("A pagina que vc busca nao existe")
        res.end();
    } catch (e) {
        res.end();
    }
})

app.listen(3000, function () {
    console.log('SERVIDOR WEB na porta 3000');
});

atualizaUsers();
setInterval(PERIODICA, 10000);
setInterval(atualizaUsers, 1000);
