/*global require console*/

(function () {
    var http = require('http'),  
    io = require('socket.io'),
    https = require('https'),
    qs = require('querystring'),
    node_static = require('node-static'),
    server = http.createServer(),
    socket = io.listen(server),
    clients = [],
    file_server = new (node_static.Server)('./client');

    server.on("request", function (req, res) {
        req.on("end", function () {
            file_server.serve(req, res);
        });
    });

    socket.on("connection", function (client) {
        clients.push(client);

        client.on("message", function (data) {
            var message = JSON.parse(data),
            recipient,
            translateUrl,
            receiveTrans;

            receiveTrans = function (recipient, message) {
                return function (res) {
                    res.on("data", function (data) {
                        var translation = JSON.parse(data),
                        transMsg;
                
                        if (translation.data) {
                            transMsg = translation.data.translations[0].translatedText;
                            recipient.send(JSON.stringify({action: "message", user: message.user, message: transMsg}));
                        }
                    });
                };   
            };

            if (message.action === "message") {
                for (recipient in clients) {
                    if (clients.hasOwnProperty(recipient) && clients[recipient] !== client) {
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

            } else if (message.action === "lang") {
                client.lang = message.lang;
                console.log("Client " + client.sessionId + " set lang to " + message.lang);
            }
        });
                  
        client.on("disconnect", function () {
            var index = clients.indexOf(client);
            clients.splice(index, 1);
        });          
    });

    server.listen(1337);

}());
