/*global require console*/

var chatServer = (function () {
    var http = require('http'),  
    io = require('socket.io'),
    https = require('https'),
    qs = require('querystring'),
    server = http.createServer(),
    socket = io.listen(server),
    clients = [];
    
    server.listen(1337);
       
    function receiveTrans(recipient, message) {
        return function (res) {
            res.on('data', function (d) {
                var translation = JSON.parse(d),
                transMsg;
                
                if (translation.data) {
                    transMsg = translation.data.translations[0].translatedText;
                    recipient.send(JSON.stringify({user: message.user, message: transMsg}));
                }
            });
        };
    }
    
    socket.on('connection', function (client) { 
        clients.push(client);
        client.on('message', function (data) {
            var message = JSON.parse(data), recipient, translateUrl;
            
            if (message.action === "message") {
                
                for (recipient in clients) {
                    if (clients.hasOwnProperty(recipient)) {
                        if (client.lang === clients[recipient].lang) {
                            clients[recipient].send(JSON.stringify(message));
                        }
                        else {
                            translateUrl = "/language/translate/v2" +
                                "?key=AIzaSyDQvD2F99tMbspU6aA6-WWFQ1nZ1Ote0eA" +
                                "&source=" + client.lang +
                                "&target=" + clients[recipient].lang +
                                "&q=" + qs.escape(message.message);
                            
                            https.get(
                                { host: "www.googleapis.com",
                                  path: translateUrl },
                                receiveTrans(clients[recipient], message));
                        }
                    }
                }
            } else if (message.action === "options") {
                client.lang = message.lang;
                console.log("Client " + client.sessionId + " set language to " + client.lang + ".");
            }
        });
        
        client.on('disconnect', function () {
            var index = clients.indexOf(client);
            if (index > 0) {
                clients.splice(index, 1);
            }
        });
    }); 
}());
