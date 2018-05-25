/*

coisas p fazer
botão logout
adicionar suporte a novas pecas
validacao correta de jogadas
 */

var servidorWebserver;
var websocket;
var botaoConecta = O('entra-user');
var userid = O('user');
var meuID;

// armazena dados da partida atual, se não estiver em partida vira undefined
var partidaAtual;


// verifica qual click o usuário fez na peça, se é p selecionar a peça ou o lugar onde ela vai
var click = 0;
// verifica qual peça foi clicada pela última vez
var posLastClick;

// verifica se o usr esta em partida
var emPartida = false;

var logUsers;

var pecas = ["♙", "♟"];



const branco = 0;
const preto = 1;
const vazio = undefined;
var tabuleiro;


function atualizaPintura() {
  var canvas = document.getElementById("myCanvas");
  var ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  desenhaTabuleiro(ctx);
  pintaTabuleiro(ctx);

}

function pintaTabuleiro(ctx) {
  
  ctx.globalCompositeOperation ='source-over';

  for(var i = 0; i < 8; i++) {
        for(var j = 0; j < 8; j++) {
            desenhapeca(ctx, tabuleiro[i][j], j, i);
        }
  }

  ctx.globalCompositeOperation ='destination-over';
}

window.onload = function() {
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");
    
}



servidorWebserver = 'ws://' + window.location.hostname + ':8080';

//startConnection(meuID);
verificaBDLocal();


botaoConecta.addEventListener('click', function() {
          envia();
}, false);

userid.addEventListener('keydown', function(e) {
    //alert(e.keyCode);    
    if(e.keyCode == 13) {
        envia();
    }
}, false);

function envia() {
     let dadosUsuario = {ID:userid.value, password:userid.value};
     //let dadosUsuario = {
     //ID:3, password:3
     //};

     liberaTela();
     startConnection(dadosUsuario);
     dadosUsuario = JSON.stringify(dadosUsuario);
     localStorage.setItem('DADOS',dadosUsuario);
}

function verificaBDLocal ()
{
    let lido = localStorage.getItem ('DADOS');
    if (lido!= undefined)
    {
        let lido2  = JSON.parse(lido);
        console.log(lido2);
        meuID = lido2;
        startConnection(lido2);
        liberaTela();
    }
    else {
        //alert("sem dados do usuario, precisa fazer login");
        bloqueiaTela();
    }
    
}


function bloqueiaTela() {
    O('users-container').style.visibility ='hidden';
    O('myCanvas').style.visibility ='hidden';
    O('login-container').style.visibility ='visible';
    
}

function liberaTela() {
    //visibility='none' // o obj nao fica armazenado
    O('login-container').style.display ='none';
    O('users-container').style.visibility ='visible';
    O('myCanvas').style.visibility ='visible';
}

function O(id) {
    return document.getElementById(id);
}

function startConnection(id) {
          meuID = id;
          websocket = new ReconnectingWebSocket(servidorWebserver)
          websocket.onopen = function(evt) {
              onOpen(evt)
          }
          websocket.onclose = function(evt) {
              onClose(evt)
          }
          websocket.onmessage = function(evt) {
              onMessage(evt)
          }
}

function onOpen(evt) {
    console.log('onOpen')
    let MSG = {
        tipo: 'LOGIN',
        valor: meuID
    };
    websocket.send(JSON.stringify(MSG))

    document.getElementById('user-welcome').innerHTML = "<br/><h3>Bem vindo:</h3> <destaque>"+meuID.ID+"</destaque><br/>";
}

function onClose(evt) {
    console.log('onClose')
}

function listaUsuarios(lst) {
    var painel = document.getElementById('users-list');
    var str = "";
        

    for(var i = 0; i < lst.length; i++) {
        if(!(lst[i] === meuID.ID)) {    
            str += lst[i] +" <button id=\""+lst[i]+"\" class='conv_but' onclick=\"convBotao(this)\">Convidar</button> <br />";
        }    
    }

    if(str != logUsers) {
        painel.innerHTML = str;
        logUsers = str;    
    }
}

function convBotao(btn) { // recebe um botao com o id do usuario
    alert(""+meuID.ID+"  Convidando o usuário "+btn.id);
    
    // um convite contem o nome de quem está enviando e quem está recebendo
    var convite = {FROM: meuID.ID, TO:btn.id};    

    websocket.send(JSON.stringify({tipo:"CONVITE",valor:convite}));
    
}

function onMessage (evt) {
  var msg = JSON.parse(evt.data);

    switch(msg.tipo) {
    case 'USERS': // Lista de usuarios online
        listaUsuarios(msg.valor);
        break;
    case 'CONVITE': // aparece na tela quando alguém convida você
        // Convite= {FROM: val1, TO:val2}

          var MSG_RESP = {tipo:'RESP_CONVITE', valor:msg.valor}
          
          var resp = confirm("Convite de partida de "+msg.valor.FROM+", deseja aceitar?");
            
          if(resp) {
            MSG_RESP.valor.resp = true;

            // usuário aceita convite e já começa partida, porém não é a vez dele ainda de jogar


            // o tabuleiro que é enviado pelo convite é iniciado na variável
            tabuleiro = MSG_RESP.valor.tabuleiro;
            
            emPartida = true;
            
            

            partidaAtual = {lado: 0, oponente: msg.valor.FROM, tabuleiro: tabuleiro, vez:msg.valor.TO};


            // aparece na tela "Vez do oponente jogar"
            alert("Vez do Oponente");            
            atualizaPintura();

          } else {
            MSG_RESP.valor.resp = false;
          }

          websocket.send(JSON.stringify(MSG_RESP));
        break;
    case 'RESP_CONVITE':
        if(msg.valor.resp == true) {
            // usuário que começou a partida pode começar jogando
            
            alert("O usuário aceitou o convite, começando partida!");            

            tabuleiro = msg.valor.tabuleiro;            
            
            partidaAtual = {lado: 1, oponente: msg.valor.TO, tabuleiro: tabuleiro, vez:msg.valor.FROM};
            atualizaPintura();
            //alert("Sua vez de jogar");            
            // aparece na tela "Sua vez de jogar"
            O('myCanvas').addEventListener("click", verificaJogada, false);
        } else {
            alert("O usuário recusou o convite.");
        }
        break;
    case 'ATUALIZA_TABULEIRO': // apos a partida começar, os clientes mandarão msg de jogada_partida, que servirá p atualizar o tabuleiro
        tabuleiro = msg.valor;
        atualizaPintura();
        O('myCanvas').addEventListener("click", verificaJogada, false);
        break;    
    default:
      break;
        
    }

}

function verificaJogada(event) {
    var posCX, posCY, lado, posMatrix;


    // peca branca( 0) ou preta(1)    
    lado = partidaAtual.lado;

    //alert(event.pageX+" "+event.pageY);

    posMatrix = coordParaPos(event.pageX, event.pageY);

    console.log("Lado = "+lado+"Evento de clique em "+posMatrix.x+" "+posMatrix.y+" tabuleiro [x][y] = "+tabuleiro[posMatrix.y][posMatrix.x]);

    //alert(posMatrix.x+" , "+posMatrix.y+" Em XY "+event.pageX+" "+event.pageY);

    if(click == 0) {
        // se encontra peca
        //partidaAtual = {lado: 1, oponente: msg.valor.TO, tabuleiro: tabuleiro, vez:msg.valor.FROM};

        // verifica se o clique é em uma peça do time do cara
        if(cliqueValido(posMatrix.x, posMatrix.y, lado)) {
             posUltimoClick = {x: posMatrix.x, y: posMatrix.y};
             click++;
             console.log("selecionada peca, x"+posUltimoClick.x+""+posUltimoClick.y);
        } else {
          console.log("peca invalida");

        }
        // marca
    } else {
        movePeca(posUltimoClick.x,posUltimoClick.y, posMatrix.x, posMatrix.y);
        O('myCanvas').removeEventListener("click", verificaJogada, false);
        // envia msg pro servidor que o cara moveu x peca para y posicao
        //partidaAtual = {lado: 0, oponente: msg.valor.FROM, tabuleiro: tabuleiro, vez:msg.valor.TO};
        let msg_valor = {jogador: meuID, oponente:partidaAtual.oponente, lado: partidaAtual.lado,xi: posUltimoClick.x,yi: posUltimoClick.y,xf: posMatrix.x,yf: posMatrix.y};
        let msg = {tipo: 'PARTIDA', valor: msg_valor};
        websocket.send(JSON.stringify(msg));

        //console.log("move de x"+posUltimoClick.x+""+posUltimoClick.y+" para "+posMatrix.x+""+posMatrix.y);
        
        delete posUltimoClick;
        click--;
    }
}

function coordParaPos(x, y) {
    //101.25
    var xi = parseInt(x/101.25);
    var yi = parseInt(y/101.25);
    var pos={x:xi, y:yi};
    return pos;	
}

/*
function envia(keycode)
{
  if (keycode.key == "Enter") 
  {
    let valor = document.getElementById('msg').value;
    websocket.send(JSON.stringify({tipo:'texto',conteudo:valor}));
    document.getElementById('msg').value='';
  }
} 
*/

function onError (evt) {
}


/*
cod da peca


var pecas = ["♙", "♟"];

const branco = 0;
const preto = 1;
const vazio = undefined;
var tabuleiro;

var pecas = ["♙", "♟"];


00 01 02
10 11 12
20 21 22

*/

function podeAvancar(xi, yi, xf, yf, tabuleiro) {
    let dado = partidaAtual.lado;

    //let dist = Math.sqrt( Math.pow((xf - xi),2.0) + Math.pow((yf - yi),2.0));    

    if(lado == 0) { // se o lado é o de cima, o peão deve andar p baixo
        
    } else { // se o lado é o de baixo, o peão deve andar p cima
        
    }    
    
    return true;
}

function cliqueValido(x, y, time) { //
    return (tabuleiro[y][x] == partidaAtual.lado);
}

function removeTabuleiro(x, y) {
    tabuleiro[y][x] = vazio;
}

// pos x, pos y, cod(branco, preto)
function adicionaTabuleiro(x, y, cod) {
    tabuleiro[y][x] = cod;
}

function movePeca(xi, yi, xf, yf) {
    adicionaTabuleiro(xf, yf, tabuleiro[yi][xi]);    
    console.log("Adicionando peca id: "+tabuleiro[yi][xi]+" em "+xf+""+yf)
    removeTabuleiro(xi, yi);
    atualizaPintura();
}

function desenhapeca(ctx, cod, x, y) {
  // onde na matriz estiver undefined, é que o espaço é vazio
  if(cod != vazio) { // vazio significa undefined
    ctx.font = "120px Comic Sans MS";
    ctx.fillText(pecas[cod], -10 + (x*100),800/8 + y*800/8);
    
    //console.log("Desenhando em "+(-10 + x)+" "+(800/8 + y*800/8)+" o valor "+ cod);
  }
}

function desenhaTabuleiro (ctx)
{   
   var img = new Image();
    img.src = "img/xadrez.png";
    img.onload = function() {
        ctx.drawImage(img, 0, 0, 800, 800);
    }
}
